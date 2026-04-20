import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import AnalysisResult, AnalyzeResponse, JobStatusResponse
from app.services.analysis_service import run_mock_analysis, save_upload

router = APIRouter()

jobs: dict[str, dict[str, object]] = {}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_file(file: UploadFile = File(...)) -> AnalyzeResponse:
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "processing", "report": None}

    saved_path = await save_upload(file)
    report = await run_mock_analysis(saved_path)

    jobs[job_id] = {
        "status": "completed",
        "report": report,
    }

    return AnalyzeResponse(job_id=job_id, status="completed")


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_status(job_id: str) -> JobStatusResponse:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(job_id=job_id, status=str(job["status"]))


@router.get("/report/{job_id}", response_model=AnalysisResult)
async def get_report(job_id: str) -> AnalysisResult:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    report = job.get("report")
    if report is None:
        raise HTTPException(status_code=202, detail="Report is not ready")

    return report
