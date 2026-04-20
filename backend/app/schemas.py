from pydantic import BaseModel


class AnalysisResult(BaseModel):
    result: str
    confidence: int
    flags: list[str]


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str


