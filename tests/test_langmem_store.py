from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from customer_support_agent.core.settings import Settings
from customer_support_agent.integrations.memory.langmem_store import CustomerMemoryStore


def test_langmem_add_resolution_and_search_returns_hit() -> None:
    store = CustomerMemoryStore(settings=Settings(), llm=object())

    store.add_resolution(
        user_id="adjuster@example.com",
        ticket_subject="Rear-end collision on I-280",
        ticket_description="Insured reports bumper and trunk damage.",
        accepted_draft="Recommend coverage under collision after deductible.",
        entity_links=["region:US"],
    )

    results = store.search(query="rear-end collision", user_id="adjuster@example.com", limit=5)

    assert results
    assert "rear-end collision" in results[0]["memory"].lower()
    assert results[0]["metadata"].get("type") == "resolution"


def test_langmem_list_memories_respects_limit() -> None:
    store = CustomerMemoryStore(settings=Settings(), llm=object())

    store.add_interaction(
        user_id="adjuster@example.com",
        user_input="First claim update",
        assistant_response="Acknowledged first claim.",
    )
    store.add_interaction(
        user_id="adjuster@example.com",
        user_input="Second claim update",
        assistant_response="Acknowledged second claim.",
    )
    store.add_interaction(
        user_id="adjuster@example.com",
        user_input="Third claim update",
        assistant_response="Acknowledged third claim.",
    )

    results = store.list_memories(user_id="adjuster@example.com", limit=2)
    assert len(results) == 2


def test_langmem_search_fallback_returns_existing_memories_for_nonmatching_query() -> None:
    store = CustomerMemoryStore(settings=Settings(), llm=object())

    store.add_resolution(
        user_id="adjuster@example.com",
        ticket_subject="Windshield crack claim",
        ticket_description="Chip expanded across windshield after hail.",
        accepted_draft="Approve glass coverage after deductible verification.",
    )

    # Non-matching query still returns recent stored memories via fallback list behavior.
    results = store.search(query="completely unrelated phrase", user_id="adjuster@example.com", limit=5)
    assert results
