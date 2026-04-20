import uuid
from pathlib import Path

from fastapi import UploadFile

from app.schemas import AnalysisResult

DATA_DIR = Path("/data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

MOCK_REPORT = AnalysisResult(
    result="FAKE",
    confidence=85,
    flags=["face anomaly", "metadata mismatch"],
)


async def save_upload(file: UploadFile) -> Path:
    file_ext = Path(file.filename or "upload.bin").suffix
    file_path = DATA_DIR / f"{uuid.uuid4().hex}{file_ext}"

    content = await file.read()
    file_path.write_bytes(content)
    return file_path


async def run_mock_analysis(_: Path) -> AnalysisResult:
    return MOCK_REPORT
