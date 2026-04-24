import sys
import os
import json
import logging
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Import the detector
try:
    from detectors.image_detector import analyze_image
except ImportError as e:
    logger.error(f"Failed to import detector module: {e}")
    logger.error("Make sure the 'detectors' package is installed and 'image_detector' module exists")
    sys.exit(1)


@dataclass
class DetectionResult:
    """Structured result from deepfake detection."""
    image_path: str
    prediction: str
    confidence: float
    inference_time: float
    model: str = "Default"
    timestamp: str = None
    details: Dict = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
        if self.details is None:
            self.details = {}
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


class ImageValidator:
    """Validates image files before processing."""
    
    SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.tiff'}
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
    
    @classmethod
    def validate_single(cls, path: str) -> Tuple[bool, str]:
        """
        Validate a single image file.
        
        Returns:
            (is_valid, error_message)
        """
        path = path.strip()
        
        if not path:
            return False, "Image path cannot be empty"
        
        if not os.path.exists(path):
            return False, f"File does not exist: {path}"
        
        if not os.path.isfile(path):
            return False, f"Path is not a file: {path}"
        
        file_ext = Path(path).suffix.lower()
        if file_ext not in cls.SUPPORTED_FORMATS:
            return False, f"Unsupported format: {file_ext}. Supported: {', '.join(sorted(cls.SUPPORTED_FORMATS))}"
        
        file_size = os.path.getsize(path)
        if file_size > cls.MAX_FILE_SIZE:
            return False, f"File too large: {file_size / (1024*1024):.1f} MB (max: 100 MB)"
        
        if file_size == 0:
            return False, "File is empty"
        
        return True, ""
    
    @classmethod
    def validate_batch(cls, paths: List[str]) -> Tuple[List[str], List[Tuple[str, str]]]:
        """
        Validate multiple image files.
        
        Returns:
            (valid_paths, [(invalid_path, error_message), ...])
        """
        valid_paths = []
        invalid_paths = []
        
        for path in paths:
            is_valid, error_msg = cls.validate_single(path)
            if is_valid:
                valid_paths.append(path)
            else:
                invalid_paths.append((path, error_msg))
        
        return valid_paths, invalid_paths


class DetectionAnalyzer:
    """Analyzes images for deepfakes using the ML model."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    
    def analyze(self, image_path: str) -> Optional[DetectionResult]:
        """
        Analyze a single image.
        
        Returns:
            DetectionResult or None if analysis fails
        """
        try:
            logger.debug(f"Starting analysis: {image_path}")
            start_time = time.time()
            
            # Call the detector
            result = analyze_image(image_path)
            inference_time = time.time() - start_time
            
            # Handle different result formats
            if isinstance(result, dict):
                detection_result = DetectionResult(
                    image_path=image_path,
                    prediction=result.get('prediction', 'Unknown'),
                    confidence=float(result.get('confidence', 0)),
                    inference_time=inference_time,
                    model=result.get('model', 'Unknown'),
                    details=result.get('details', {})
                )
            elif isinstance(result, str):
                detection_result = DetectionResult(
                    image_path=image_path,
                    prediction=result,
                    confidence=0.0,
                    inference_time=inference_time
                )
            else:
                logger.warning(f"Unexpected result type: {type(result)}")
                detection_result = DetectionResult(
                    image_path=image_path,
                    prediction=str(result),
                    confidence=0.0,
                    inference_time=inference_time
                )
            
            logger.info(f"✓ Analysis complete: {image_path} → {detection_result.prediction} ({detection_result.confidence:.1%})")
            return detection_result
            
        except Exception as e:
            logger.error(f"✗ Failed to analyze {image_path}: {e}", exc_info=self.verbose)
            return None
    
    def analyze_batch(self, image_paths: List[str]) -> Tuple[List[DetectionResult], int]:
        """
        Analyze multiple images.
        
        Returns:
            (successful_results, failure_count)
        """
        results = []
        failures = 0
        
        total = len(image_paths)
        logger.info(f"Starting batch analysis: {total} image(s)")
        
        for idx, path in enumerate(image_paths, 1):
            logger.debug(f"[{idx}/{total}] Processing: {path}")
            result = self.analyze(path)
            if result:
                results.append(result)
            else:
                failures += 1
        
        return results, failures


class OutputFormatter:
    """Formats detection results for different output types."""
    
    @staticmethod
    def format_human_readable(results: List[DetectionResult], summary: bool = True) -> str:
        """Format results for human reading."""
        output = []
        
        for result in results:
            output.append("\n" + "=" * 70)
            output.append("DEEPFAKE DETECTION RESULT")
            output.append("=" * 70)
            output.append(f"Image:           {result.image_path}")
            output.append(f"Timestamp:       {result.timestamp}")
            
            # Color-coded prediction
            prediction = result.prediction.upper()
            if prediction == 'FAKE':
                status = f"🚨 {prediction}"
            elif prediction == 'REAL':
                status = f"✅ {prediction}"
            else:
                status = prediction
            
            output.append(f"Prediction:      {status}")
            output.append(f"Confidence:      {result.confidence:>6.1%}")
            output.append(f"Inference Time:  {result.inference_time:>6.3f}s")
            
            if result.model != "Default":
                output.append(f"Model:           {result.model}")
            
            if result.details:
                output.append("\nDetails:")
                for key, value in result.details.items():
                    output.append(f"  • {key}: {value}")
        
        if summary and len(results) > 1:
            output.append("\n" + "=" * 70)
            output.append(f"SUMMARY: Processed {len(results)} image(s)")
            fake_count = sum(1 for r in results if r.prediction.upper() == 'FAKE')
            real_count = sum(1 for r in results if r.prediction.upper() == 'REAL')
            output.append(f"  Real:    {real_count}")
            output.append(f"  Fake:    {fake_count}")
            avg_time = sum(r.inference_time for r in results) / len(results)
            output.append(f"  Avg Time: {avg_time:.3f}s")
            output.append("=" * 70)
        
        return "\n".join(output)
    
    @staticmethod
    def format_json(results: List[DetectionResult], pretty: bool = True) -> str:
        """Format results as JSON."""
        data = {
            'timestamp': datetime.now().isoformat(),
            'total_images': len(results),
            'results': [r.to_dict() for r in results],
            'summary': {
                'real_count': sum(1 for r in results if r.prediction.upper() == 'REAL'),
                'fake_count': sum(1 for r in results if r.prediction.upper() == 'FAKE'),
                'unknown_count': sum(1 for r in results if r.prediction.upper() not in ('REAL', 'FAKE')),
                'avg_confidence': sum(r.confidence for r in results) / len(results) if results else 0,
                'avg_inference_time': sum(r.inference_time for r in results) / len(results) if results else 0
            }
        }
        
        if pretty:
            return json.dumps(data, indent=2)
        else:
            return json.dumps(data)
    
    @staticmethod
    def format_csv(results: List[DetectionResult]) -> str:
        """Format results as CSV."""
        if not results:
            return ""
        
        lines = []
        header = ['image_path', 'prediction', 'confidence', 'inference_time_s', 'model', 'timestamp']
        lines.append(','.join(header))
        
        for result in results:
            row = [
                result.image_path,
                result.prediction,
                f"{result.confidence:.4f}",
                f"{result.inference_time:.3f}",
                result.model,
                result.timestamp
            ]
            lines.append(','.join(row))
        
        return '\n'.join(lines)


def get_image_paths_from_input(input_arg: str) -> List[str]:
    """
    Get image paths from either a single file or directory.
    
    Returns:
        List of image file paths
    """
    input_path = Path(input_arg)
    
    if input_path.is_file():
        return [str(input_path)]
    elif input_path.is_dir():
        # Find all supported image files in directory
        image_paths = []
        supported = ImageValidator.SUPPORTED_FORMATS
        
        for ext in supported:
            image_paths.extend(input_path.glob(f'*{ext}'))
            image_paths.extend(input_path.glob(f'*{ext.upper()}'))
        
        return sorted(set(str(p) for p in image_paths))
    else:
        return []


def main():
    parser = argparse.ArgumentParser(
        description='Deepfake Detection System - Detect real vs synthetic images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python test_optimized.py image.jpg
  python test_optimized.py /path/to/images --format json
  python test_optimized.py test.png --format csv --output results.csv
  python test_optimized.py images/ --verbose
        '''
    )
    
    parser.add_argument(
        'image',
        nargs='?',
        default='test_real.png',
        help='Image file or directory of images to analyze (default: test_real.png)'
    )
    
    parser.add_argument(
        '-f', '--format',
        choices=['human', 'json', 'csv'],
        default='human',
        help='Output format (default: human)'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=str,
        default=None,
        help='Save output to file (optional)'
    )
    
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    parser.add_argument(
        '--no-summary',
        action='store_true',
        help='Disable summary output for batch processing'
    )
    
    args = parser.parse_args()
    
    # Set up logging
    if args.verbose:
        logger.setLevel(logging.DEBUG)
        logger.debug("Verbose mode enabled")
    
    logger.info("=" * 70)
    logger.info("DEEPFAKE DETECTION TEST STARTED")
    logger.info("=" * 70)
    
    # Get image paths
    image_paths = get_image_paths_from_input(args.image)
    
    if not image_paths:
        logger.error(f"No images found: {args.image}")
        sys.exit(1)
    
    # Validate images
    valid_paths, invalid_paths = ImageValidator.validate_batch(image_paths)
    
    if invalid_paths:
        for path, error in invalid_paths:
            logger.warning(f"Skipping invalid image: {path} - {error}")
    
    if not valid_paths:
        logger.error("No valid images to process")
        sys.exit(1)
    
    logger.info(f"Found {len(valid_paths)} valid image(s) to process")
    
    # Analyze images
    analyzer = DetectionAnalyzer(verbose=args.verbose)
    results, failures = analyzer.analyze_batch(valid_paths)
    
    if not results:
        logger.error("Failed to analyze any images")
        sys.exit(1)
    
    # Format output
    if args.format == 'json':
        output = OutputFormatter.format_json(results, pretty=True)
    elif args.format == 'csv':
        output = OutputFormatter.format_csv(results)
    else:  # human
        output = OutputFormatter.format_human_readable(results, summary=not args.no_summary)
    
    # Print output
    print(output)
    
    # Save to file if requested
    if args.output:
        try:
            with open(args.output, 'w') as f:
                f.write(output)
            logger.info(f"Results saved to: {args.output}")
        except Exception as e:
            logger.error(f"Failed to save output: {e}")
            sys.exit(1)
    
    # Log summary
    logger.info("=" * 70)
    logger.info(f"Analysis complete: {len(results)} successful, {failures} failed")
    logger.info("=" * 70)
    
    # Exit with appropriate code
    sys.exit(0 if failures == 0 else 1)


if __name__ == "__main__":
    main()