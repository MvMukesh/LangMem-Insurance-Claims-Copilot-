from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from customer_support_agent.api import dependencies
from customer_support_agent.api.app_factory import create_app
from customer_support_agent.api.routers import drafts as drafts_router
from customer_support_agent.core.settings import Settings
from customer_support_agent.repositories.sqlite import base as sqlite_base


class _FakeCopilot:
    def generate_draft(self, ticket: dict, customer: dict) -> dict:
        _ = ticket
        _ = customer
        return {
            "draft": "Preliminary coverage recommendation.",
            "context_used": {
                "version": 2,
                "signals": {
                    "memory_hit_count": 0,
                    "knowledge_hit_count": 0,
                    "tool_call_count": 0,
                    "tool_error_count": 0,
                    "knowledge_sources": [],
                },
                "highlights": {"memory": [], "knowledge": [], "tools": []},
                "memory_hits": [],
                "knowledge_hits": [],
                "tool_calls": [],
            },
        }

    def save_accepted_resolution(self, **kwargs) -> None:
        _ = kwargs


def test_draft_status_lifecycle_smoke(tmp_path: Path, monkeypatch) -> None:
    settings = Settings(
        workspace_dir=tmp_path,
        data_dir=Path("data"),
        db_path=Path("data/support.db"),
        chroma_rag_dir=Path("data/chroma_rag"),
        chroma_mem0_dir=Path("data/chroma_mem0"),
        knowledge_base_dir=Path("knowledge_base"),
    )

    monkeypatch.setattr(sqlite_base, "get_settings", lambda: settings)
    dependencies.get_copilot.cache_clear()

    app = create_app(settings=settings)
    fake_copilot = _FakeCopilot()
    app.dependency_overrides[dependencies.get_copilot_or_503] = lambda: fake_copilot
    monkeypatch.setattr(drafts_router, "get_copilot", lambda: fake_copilot)

    with TestClient(app) as client:
        create_claim = client.post(
            "/api/tickets",
            json={
                "customer_email": "claimant@example.com",
                "customer_name": "Alex Claimant",
                "customer_company": "Acme Fleet",
                "subject": "Auto claim FNOL",
                "description": "Collision reported with rear bumper damage and tow request.",
                "priority": "high",
                "auto_generate": False,
            },
        )
        assert create_claim.status_code == 200
        claim_id = create_claim.json()["id"]

        generate_first = client.post(f"/api/tickets/{claim_id}/generate-draft")
        assert generate_first.status_code == 200
        first_draft_id = generate_first.json()["draft"]["id"]

        approve = client.patch(
            f"/api/drafts/{first_draft_id}",
            json={
                "content": "Approved recommendation by adjuster.",
                "status": "accepted",
            },
        )
        assert approve.status_code == 200
        assert approve.json()["status"] == "accepted"

        generate_second = client.post(f"/api/tickets/{claim_id}/generate-draft")
        assert generate_second.status_code == 200
        second_draft_id = generate_second.json()["draft"]["id"]

        request_info = client.patch(
            f"/api/drafts/{second_draft_id}",
            json={
                "content": "Need police report and repair estimate.",
                "status": "discarded",
            },
        )
        assert request_info.status_code == 200
        assert request_info.json()["status"] == "discarded"
