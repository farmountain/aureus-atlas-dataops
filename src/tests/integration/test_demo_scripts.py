"""
Integration tests for demo scripts
Tests the end-to-end demo workflows with evidence generation
"""
import subprocess
import json
import os
from pathlib import Path
from datetime import datetime
import pytest

SCRIPT_DIR = Path(__file__).parent.parent.parent / "scripts"
EVIDENCE_DIR = Path(__file__).parent.parent.parent / "evidence"


class TestDemoScripts:
    """Test suite for demo scripts"""

    def test_demo_helpers_exist(self):
        """Verify demo helper library exists"""
        helpers_path = SCRIPT_DIR / "lib" / "demo_helpers.sh"
        assert helpers_path.exists(), "demo_helpers.sh not found"
        assert helpers_path.stat().st_size > 0, "demo_helpers.sh is empty"

    def test_credit_risk_demo_exists(self):
        """Verify credit risk demo script exists"""
        demo_path = SCRIPT_DIR / "demo_credit_risk.sh"
        assert demo_path.exists(), "demo_credit_risk.sh not found"
        assert demo_path.stat().st_size > 0, "demo_credit_risk.sh is empty"

    def test_fcc_triage_demo_exists(self):
        """Verify FCC triage demo script exists"""
        demo_path = SCRIPT_DIR / "demo_fcc_triage.sh"
        assert demo_path.exists(), "demo_fcc_triage.sh not found"
        assert demo_path.stat().st_size > 0, "demo_fcc_triage.sh is empty"

    def test_finance_recon_demo_exists(self):
        """Verify finance reconciliation demo script exists"""
        demo_path = SCRIPT_DIR / "demo_finance_recon.sh"
        assert demo_path.exists(), "demo_finance_recon.sh not found"
        assert demo_path.stat().st_size > 0, "demo_finance_recon.sh is empty"

    def test_scripts_executable(self):
        """Verify all demo scripts are executable"""
        demo_scripts = [
            "demo_credit_risk.sh",
            "demo_fcc_triage.sh",
            "demo_finance_recon.sh",
        ]
        for script_name in demo_scripts:
            script_path = SCRIPT_DIR / script_name
            assert os.access(
                script_path, os.X_OK
            ), f"{script_name} is not executable"

    @pytest.mark.integration
    def test_credit_risk_demo_execution(self):
        """Test credit risk demo executes successfully"""
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        result = subprocess.run(
            [str(script_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )

        assert result.returncode == 0, f"Demo failed: {result.stderr}"
        assert "DEMO COMPLETE" in result.stdout
        assert "All steps completed successfully" in result.stdout

        # Verify evidence was generated
        assert "evidence/credit_risk_portfolio_" in result.stdout

    @pytest.mark.integration
    def test_fcc_triage_demo_execution(self):
        """Test FCC triage demo executes successfully"""
        script_path = SCRIPT_DIR / "demo_fcc_triage.sh"
        result = subprocess.run(
            [str(script_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )

        assert result.returncode == 0, f"Demo failed: {result.stderr}"
        assert "DEMO COMPLETE" in result.stdout
        assert "All steps completed successfully" in result.stdout
        assert "Compliance Controls Verified" in result.stdout

        # Verify evidence was generated
        assert "evidence/fcc_aml_triage_" in result.stdout

    @pytest.mark.integration
    def test_finance_recon_demo_execution(self):
        """Test finance reconciliation demo executes successfully"""
        script_path = SCRIPT_DIR / "demo_finance_recon.sh"
        result = subprocess.run(
            [str(script_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )

        assert result.returncode == 0, f"Demo failed: {result.stderr}"
        assert "DEMO COMPLETE" in result.stdout
        assert "All steps completed successfully" in result.stdout
        assert "SOX Compliance Controls" in result.stdout

        # Verify evidence was generated
        assert "evidence/finance_reconciliation_" in result.stdout


class TestEvidenceGeneration:
    """Test evidence pack generation"""

    def find_latest_evidence_dir(self, prefix: str) -> Path:
        """Find the latest evidence directory for a given prefix"""
        if not EVIDENCE_DIR.exists():
            return None

        matching_dirs = sorted(
            [d for d in EVIDENCE_DIR.iterdir() if d.is_dir() and d.name.startswith(prefix)],
            key=lambda x: x.stat().st_mtime,
            reverse=True,
        )

        return matching_dirs[0] if matching_dirs else None

    @pytest.mark.integration
    def test_credit_risk_evidence_structure(self):
        """Test credit risk evidence pack structure"""
        # Run demo first
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = self.find_latest_evidence_dir("credit_risk_portfolio_")
        assert evidence_dir is not None, "Evidence directory not found"

        # Check required files
        required_files = [
            "01_config_copilot_request.json",
            "02_validation_results.json",
            "03_commit_results.json",
            "04_pipeline_generation.json",
            "07_query_execution.json",
            "evidence_pack.json",
            "evidence_pack.md",
        ]

        for filename in required_files:
            file_path = evidence_dir / filename
            assert file_path.exists(), f"Missing evidence file: {filename}"

            # Validate JSON files
            if filename.endswith(".json"):
                with open(file_path) as f:
                    data = json.load(f)
                    assert data, f"Empty JSON in {filename}"

    @pytest.mark.integration
    def test_fcc_evidence_has_approval(self):
        """Test FCC evidence includes approval workflow"""
        # Run demo first
        script_path = SCRIPT_DIR / "demo_fcc_triage.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = self.find_latest_evidence_dir("fcc_aml_triage_")
        assert evidence_dir is not None, "Evidence directory not found"

        # Check for approval files (HIGH PII requires approval)
        approval_request = evidence_dir / "05_approval_request.json"
        approval_granted = evidence_dir / "06_approval_granted.json"

        assert approval_request.exists(), "Approval request missing"
        assert approval_granted.exists(), "Approval granted missing"

        # Validate approval was granted
        with open(approval_granted) as f:
            approval_data = json.load(f)
            assert approval_data["status"] == "APPROVED"

    @pytest.mark.integration
    def test_evidence_pack_metadata(self):
        """Test evidence pack contains proper metadata"""
        # Run demo first
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = self.find_latest_evidence_dir("credit_risk_portfolio_")
        assert evidence_dir is not None, "Evidence directory not found"

        # Check evidence_pack.json
        evidence_json = evidence_dir / "evidence_pack.json"
        with open(evidence_json) as f:
            data = json.load(f)

            assert "evidence_pack" in data
            pack = data["evidence_pack"]

            assert "demo_name" in pack
            assert "timestamp" in pack
            assert "evidence_dir" in pack
            assert "artifacts" in pack
            assert "compliance_status" in pack

            # Check compliance status
            compliance = pack["compliance_status"]
            assert compliance["egd_compliant"] is True
            assert compliance["aureus_compliant"] is True
            assert compliance["policy_checks_passed"] is True
            assert compliance["audit_trail_complete"] is True
            assert compliance["rollback_available"] is True


class TestDemoWorkflowSteps:
    """Test individual workflow steps in demos"""

    @pytest.mark.integration
    def test_config_copilot_step(self):
        """Test config copilot generates valid specs"""
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = TestEvidenceGeneration().find_latest_evidence_dir(
            "credit_risk_portfolio_"
        )
        config_file = evidence_dir / "01_config_copilot_request.json"

        with open(config_file) as f:
            data = json.load(f)

            assert "run_id" in data
            assert "request" in data
            assert "generated_specs" in data
            assert "validation_status" in data
            assert data["validation_status"] == "PASS"

            specs = data["generated_specs"]
            assert "dataset_contract" in specs
            assert "dq_rules" in specs
            assert "policy_spec" in specs
            assert "sla_spec" in specs

    @pytest.mark.integration
    def test_validation_step(self):
        """Test validation produces results"""
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = TestEvidenceGeneration().find_latest_evidence_dir(
            "credit_risk_portfolio_"
        )
        validation_file = evidence_dir / "02_validation_results.json"

        with open(validation_file) as f:
            data = json.load(f)

            assert "validation_results" in data
            assert "overall_status" in data
            assert data["overall_status"] == "PASS"

            results = data["validation_results"]
            assert results["dataset_contract"]["valid"] is True
            assert results["dq_rules"]["valid"] is True
            assert results["policy_spec"]["valid"] is True
            assert results["sla_spec"]["valid"] is True

    @pytest.mark.integration
    def test_commit_creates_snapshot(self):
        """Test commit step creates snapshot for rollback"""
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = TestEvidenceGeneration().find_latest_evidence_dir(
            "credit_risk_portfolio_"
        )
        commit_file = evidence_dir / "03_commit_results.json"

        with open(commit_file) as f:
            data = json.load(f)

            assert "commit" in data
            assert "audit_trail" in data
            assert "rollback_plan" in data

            commit = data["commit"]
            assert "snapshot_id" in commit
            assert commit["status"] == "COMMITTED"

            rollback = data["rollback_plan"]
            assert "snapshot_id" in rollback
            assert "restore_command" in rollback

    @pytest.mark.integration
    def test_query_execution_has_policy_checks(self):
        """Test query execution includes policy checks"""
        script_path = SCRIPT_DIR / "demo_credit_risk.sh"
        subprocess.run([str(script_path)], capture_output=True, timeout=60)

        evidence_dir = TestEvidenceGeneration().find_latest_evidence_dir(
            "credit_risk_portfolio_"
        )
        query_file = evidence_dir / "07_query_execution.json"

        with open(query_file) as f:
            data = json.load(f)

            assert "policy_checks" in data
            assert "guard_decision" in data

            policy = data["policy_checks"]
            assert "pii_access" in policy
            assert "cross_border" in policy
            assert "purpose_limitation" in policy

            guard = data["guard_decision"]
            assert guard["allowed"] is True
            assert "audit_event_id" in guard
            assert "budget_consumed" in guard


class TestDemoCompliance:
    """Test compliance aspects of demos"""

    def test_all_demos_enforce_guard(self):
        """Test all demos use AUREUS guard"""
        demo_scripts = [
            "demo_credit_risk.sh",
            "demo_fcc_triage.sh",
            "demo_finance_recon.sh",
        ]

        for script_name in demo_scripts:
            script_path = SCRIPT_DIR / script_name
            with open(script_path) as f:
                content = f.read()
                assert (
                    "guard_decision" in content
                ), f"{script_name} missing guard checks"
                assert (
                    "audit_event" in content
                ), f"{script_name} missing audit events"
                assert (
                    "snapshot" in content
                ), f"{script_name} missing snapshot creation"

    def test_all_demos_generate_evidence(self):
        """Test all demos generate evidence packs"""
        demo_scripts = [
            "demo_credit_risk.sh",
            "demo_fcc_triage.sh",
            "demo_finance_recon.sh",
        ]

        for script_name in demo_scripts:
            script_path = SCRIPT_DIR / script_name
            with open(script_path) as f:
                content = f.read()
                assert (
                    "generate_evidence_pack" in content
                ), f"{script_name} missing evidence pack generation"
                assert (
                    "evidence_pack.json" in content
                ), f"{script_name} missing evidence JSON"
                assert (
                    "evidence_pack.md" in content
                ), f"{script_name} missing evidence markdown"

    def test_high_pii_demos_require_approval(self):
        """Test HIGH PII demos require approval"""
        script_path = SCRIPT_DIR / "demo_fcc_triage.sh"
        with open(script_path) as f:
            content = f.read()
            assert (
                'pii_level": "HIGH' in content
            ), "FCC demo should have HIGH PII"
            assert (
                "simulate_approval_request" in content
            ), "FCC demo should require approval"
            assert (
                '"true"' in content
            ), "FCC demo should set requires_approval to true"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
