import { useRef, useState } from "react";
import axios from "axios";

const ACCEPTED_FILE_TYPES = "image/*,video/*,text/*,.txt,.csv,.json,.md";
const ANALYZE_URL = "http://127.0.0.1:8000/analyze";

function UploadComponent({ onUploadResult, onUploadError }) {
	const inputRef = useRef(null);
	const [selectedFile, setSelectedFile] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	const notifyError = (message) => {
		if (typeof onUploadError === "function") {
			onUploadError(message);
		}
	};

	const handleSelectedFile = (file) => {
		if (!file) {
			return;
		}
		setSelectedFile(file);
	};

	const handleFileInputChange = (event) => {
		handleSelectedFile(event.target.files?.[0] ?? null);
	};

	const handleDrop = (event) => {
		event.preventDefault();
		setIsDragging(false);
		handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
	};

	const handleUpload = async () => {
		if (!selectedFile || isLoading) {
			if (!selectedFile) {
				notifyError("Please select a file before uploading.");
			}
			return;
		}

		setIsLoading(true);

		const formData = new FormData();
		formData.append("file", selectedFile);

		try {
			const response = await axios.post(ANALYZE_URL, formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			if (typeof onUploadResult === "function") {
				onUploadResult(response.data);
			}
		} catch (error) {
			const message = error?.response?.data?.detail || error.message || "Upload failed.";
			notifyError(message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div
				role="button"
				tabIndex={0}
				onClick={() => inputRef.current?.click()}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						inputRef.current?.click();
					}
				}}
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
					isDragging
						? "border-blue-500 bg-blue-50"
						: "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
				}`}
			>
				<p className="text-lg font-semibold text-slate-800">Drag and drop a file here</p>
				<p className="mt-1 text-sm text-slate-500">or click to browse</p>
				<p className="mt-3 text-xs text-slate-500">Accepted: video, image, and text files</p>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_FILE_TYPES}
				className="hidden"
				onChange={handleFileInputChange}
			/>

			<div className="mt-4 flex items-center justify-between gap-3">
				<p className="truncate text-sm text-slate-700">
					{selectedFile ? `Selected: ${selectedFile.name}` : "No file selected"}
				</p>
				<button
					type="button"
					onClick={handleUpload}
					disabled={isLoading}
					className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
				>
					{isLoading ? "Uploading..." : "Upload"}
				</button>
			</div>
		</section>
	);
}

export default UploadComponent;
