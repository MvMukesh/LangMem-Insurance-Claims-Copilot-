from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from langchain.embeddings import init_embeddings
from langgraph.store.memory import InMemoryStore
from langmem import create_manage_memory_tool

from customer_support_agent.core.settings import Settings

logger = logging.getLogger(__name__)


class CustomerMemoryStore:
    def __init__(self, settings: Settings, llm: Any):
        self._settings = settings
        _ = llm

        self._store = self._build_store()
        self._manage_memory_tool = create_manage_memory_tool(
            namespace=("memories", "{memory_user_id}"),
            store=self._store,
            actions_permitted=("create",),
        )
        logger.info(
            "Memory backend initialized: provider=langmem mode=hot_path store=inmemory fallback=fallback_store"
        )

    def _build_store(self) -> InMemoryStore:
        if not self._settings.google_api_key:
            logger.info("memory.index.disabled reason=no_google_api_key")
            return InMemoryStore()

        model_name = self._settings.effective_google_embedding_model
        try:
            embeddings = init_embeddings(
                model=model_name,
                provider="google_genai",
                google_api_key=self._settings.google_api_key,
            )

            # LangGraph index requires vector dimensions. Infer from one probe embedding.
            dims = len(embeddings.embed_query("memory-dimension-probe"))
            logger.info("memory.index.enabled provider=google_genai model=%s dims=%s", model_name, dims)
            return InMemoryStore(
                index={
                    "dims": dims,
                    "embed": embeddings,
                    "fields": ["content"],
                }
            )
        except Exception:
            logger.exception(
                "memory.index.init_failed provider=google_genai model=%s; semantic index disabled",
                model_name,
            )
            return InMemoryStore()

    def search(self, query: str, user_id: str, limit: int = 5) -> list[dict[str, Any]]:
        logger.info(
            "memory.search.start user=%s limit=%s query=%r",
            self._namespace_label(user_id),
            max(1, limit),
            (query or "").strip()[:120],
        )
        raw = self._search_items(query=query, user_id=user_id, limit=limit)
        normalized = self._normalize_results(raw, limit=limit)
        logger.info(
            "memory.search.done user=%s returned=%s",
            self._namespace_label(user_id),
            len(normalized),
        )
        return normalized

    def list_memories(self, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
        logger.info(
            "memory.list.start user=%s limit=%s",
            self._namespace_label(user_id),
            max(1, limit),
        )
        raw = self._search_items(query=None, user_id=user_id, limit=limit)
        normalized = self._normalize_results(raw, limit=limit)
        logger.info(
            "memory.list.done user=%s returned=%s",
            self._namespace_label(user_id),
            len(normalized),
        )
        return normalized

    def add_interaction(
        self,
        user_id: str,
        user_input: str,
        assistant_response: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        memory_text = (
            f"Claim interaction summary:\n"
            f"Claimant message: {user_input.strip()}\n"
            f"Assistant response: {assistant_response.strip()}"
        )
        logger.info(
            "memory.add_interaction.start user=%s chars=%s",
            self._namespace_label(user_id),
            len(memory_text),
        )
        self._create_memory(user_id=user_id, text=memory_text, metadata=metadata)
        logger.info(
            "memory.add_interaction.done user=%s",
            self._namespace_label(user_id),
        )

    def add_resolution(
        self,
        user_id: str,
        ticket_subject: str,
        ticket_description: str,
        accepted_draft: str,
        entity_links: list[str] | None = None,
    ) -> None:
        entity_text = ""
        if entity_links:
            entity_text = "\nLinked entities: " + ", ".join(entity_links)

        memory_text = (
            "Coverage recommendation approved by licensed adjuster.\n"
            f"Claim subject: {ticket_subject}\n"
            f"Claim details: {ticket_description}\n"
            f"Approved recommendation: {accepted_draft.strip()}"
            f"{entity_text}"
        )
        logger.info(
            "memory.add_resolution.start user=%s subject=%r entities=%s",
            self._namespace_label(user_id),
            (ticket_subject or "").strip()[:120],
            len(entity_links or []),
        )
        self._create_memory(
            user_id=user_id,
            text=memory_text,
            metadata={"type": "resolution"},
        )
        logger.info(
            "memory.add_resolution.done user=%s",
            self._namespace_label(user_id),
        )

    def _create_memory(
        self,
        user_id: str,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        clean_text = text.strip()
        if not clean_text:
            logger.warning(
                "memory.create.skipped_empty user=%s",
                self._namespace_label(user_id),
            )
            return

        config = self._tool_config(user_id=user_id)

        key: str | None = None

        try:
            logger.info(
                "memory.create.attempt system=langmem_tool user=%s",
                self._namespace_label(user_id),
            )
            result = self._manage_memory_tool.invoke(
                {
                    "action": "create",
                    "content": clean_text,
                },
                config=config,
            )
            key = self._extract_key_from_manage_result(result)
            if key:
                logger.info(
                    "memory.create.success system=langmem_tool user=%s key=%s",
                    self._namespace_label(user_id),
                    key,
                )
            else:
                logger.warning(
                    "memory.create.no_key system=langmem_tool user=%s raw_result=%r",
                    self._namespace_label(user_id),
                    str(result)[:200],
                )
        except Exception:
            logger.exception(
                "memory.create.error system=langmem_tool user=%s; using fallback_store",
                self._namespace_label(user_id),
            )
            key = None

        # Ensure deterministic persistence even if tool invocation fails unexpectedly.
        if not key:
            key = str(uuid.uuid4())
            self._store.put(
                self._namespace_for_user(user_id),
                key=key,
                value={"content": clean_text, "metadata": metadata or {}},
            )
            logger.info(
                "memory.create.success system=fallback_store user=%s key=%s",
                self._namespace_label(user_id),
                key,
            )
            return

        if not metadata:
            logger.info(
                "memory.create.metadata.skip_update system=langmem_tool user=%s key=%s",
                self._namespace_label(user_id),
                key,
            )
            return

        item = self._store.get(self._namespace_for_user(user_id), key)
        if not item:
            logger.warning(
                "memory.create.metadata.item_missing user=%s key=%s",
                self._namespace_label(user_id),
                key,
            )
            return
        value = dict(item.value or {})
        item_metadata = dict(value.get("metadata") or {})
        item_metadata.update(metadata)
        value["metadata"] = item_metadata
        self._store.put(self._namespace_for_user(user_id), key=key, value=value)
        logger.info(
            "memory.create.metadata.updated user=%s key=%s metadata_keys=%s",
            self._namespace_label(user_id),
            key,
            sorted(item_metadata.keys()),
        )


    def _search_items(
        self,
        query: str | None,
        user_id: str,
        limit: int,
    ) -> list[Any]:
        safe_limit = max(1, limit)
        namespace = self._namespace_for_user(user_id)

        if query and query.strip():
            results = self._store.search(namespace, query=query.strip(), limit=safe_limit)
            if results:
                logger.info(
                    "memory.search.path system=langmem_store.semantic user=%s returned=%s",
                    self._namespace_label(user_id),
                    len(results),
                )
                return results
            logger.info(
                "memory.search.path system=langmem_store.semantic user=%s returned=0; fallback=list_recent",
                self._namespace_label(user_id),
            )

        # Fallback: return latest memories even if query misses.
        fallback = self._store.search(namespace, query=None, limit=safe_limit)
        logger.info(
            "memory.search.path system=fallback_store.list_recent user=%s returned=%s",
            self._namespace_label(user_id),
            len(fallback),
        )
        return fallback

    @staticmethod
    def _tool_config(user_id: str) -> dict[str, Any]:
        return {"configurable": {"memory_user_id": CustomerMemoryStore._namespace_label(user_id)}}

    @staticmethod
    def _namespace_for_user(user_id: str) -> tuple[str, str]:
        return ("memories", CustomerMemoryStore._namespace_label(user_id))

    @staticmethod
    def _namespace_label(user_id: str) -> str:
        normalized = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(user_id or "").strip().lower()).strip("-")
        return normalized or "unknown-user"

    @staticmethod
    def _extract_key_from_manage_result(result: Any) -> str | None:
        text = str(result or "")
        match = re.search(r"created memory\s+([a-fA-F0-9-]+)", text)
        if match:
            return match.group(1)
        return None

    def _normalize_results(self, raw: Any, limit: int) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []

        if isinstance(raw, dict) and "results" in raw:
            iterable = raw.get("results") or []
        elif isinstance(raw, list):
            iterable = raw
        else:
            iterable = []

        for entry in iterable[: max(1, limit)]:
            value: Any = entry
            score: float | None = None

            if hasattr(entry, "value"):
                value = getattr(entry, "value")
                score = getattr(entry, "score", None)

            if hasattr(value, "model_dump"):
                value = value.model_dump()

            if isinstance(value, dict):
                metadata = dict(value.get("metadata") or {})
                memory_text = str(
                    value.get("memory")
                    or value.get("content")
                    or value.get("text")
                    or value.get("summary")
                    or ""
                ).strip()
                if not memory_text:
                    continue
                items.append(
                    {
                        "memory": memory_text,
                        "score": score,
                        "metadata": metadata,
                    }
                )
                continue

            if not value:
                continue
            items.append({"memory": str(value), "score": score, "metadata": {}})

        return items


