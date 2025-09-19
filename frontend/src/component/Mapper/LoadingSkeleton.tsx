import { observer } from "mobx-react-lite";
import type React from "react";
import { loadingStore } from "../../stores/LoadingStore";

interface LoadingSkeletonProps {
	isProcessing: boolean;
	message?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = observer(
	({ isProcessing, message = "Loading map data..." }) => {
		const shouldShow = isProcessing || loadingStore.isLoading;

		if (!shouldShow) return null;

		return (
			<div className="loading-skeleton-overlay">
				{/* Loading spinner in center */}
				<div className="loading-spinner-container">
					<div className="loading-spinner" />
					<div className="loading-message">{message}</div>
				</div>

				{/* CSS for loading skeleton */}
				<style>
					{`
					.loading-skeleton-overlay {
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background: rgba(255, 255, 255, 0.95);
						z-index: 1000;
						pointer-events: none;
						display: flex;
						align-items: center;
						justify-content: center;
					}

					.loading-spinner-container {
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 16px;
						background: white;
						padding: 24px 32px;
						border-radius: 12px;
						box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
						border: 1px solid rgba(0, 0, 0, 0.05);
						backdrop-filter: blur(8px);
						animation: fadeIn 0.3s ease-out;
					}

					.loading-spinner {
						width: 40px;
						height: 40px;
						border: 3px solid #f3f4f6;
						border-top: 3px solid #3b82f6;
						border-radius: 50%;
						animation: spin 1s linear infinite;
					}

					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}

					@keyframes fadeIn {
						0% { opacity: 0; transform: scale(0.95); }
						100% { opacity: 1; transform: scale(1); }
					}

					.loading-message {
						color: #374151;
						font-size: 14px;
						font-weight: 500;
						text-align: center;
						margin: 0;
						line-height: 1.5;
					}

					/* Skeleton regions effect - more realistic map shapes */
					.loading-skeleton-overlay::before {
						content: '';
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f9fafb"/><path d="M50 80 L120 75 L140 95 L110 120 L80 115 Z" fill="%23e5e7eb"/><path d="M160 60 L200 55 L220 70 L195 85 L170 80 Z" fill="%23e5e7eb"/><path d="M240 90 L290 85 L310 110 L280 125 L250 120 Z" fill="%23e5e7eb"/><path d="M80 140 L130 135 L150 155 L120 170 L90 165 Z" fill="%23e5e7eb"/><path d="M180 120 L230 115 L250 135 L220 150 L190 145 Z" fill="%23e5e7eb"/><path d="M270 150 L320 145 L340 165 L310 180 L280 175 Z" fill="%23e5e7eb"/><path d="M60 200 L110 195 L130 215 L100 230 L70 225 Z" fill="%23e5e7eb"/><path d="M140 180 L190 175 L210 195 L180 210 L150 205 Z" fill="%23e5e7eb"/><path d="M220 210 L270 205 L290 225 L260 240 L230 235 Z" fill="%23e5e7eb"/><path d="M300 180 L350 175 L370 195 L340 210 L310 205 Z" fill="%23e5e7eb"/></svg>') center/cover;
						opacity: 0.2;
						z-index: -1;
					}

					/* Animate skeleton regions */
					.loading-skeleton-overlay::before {
						animation: pulse 2.5s ease-in-out infinite;
					}

					@keyframes pulse {
						0%, 100% { opacity: 0.2; }
						50% { opacity: 0.4; }
					}
				`}
				</style>
			</div>
		);
	},
);

export default LoadingSkeleton;
