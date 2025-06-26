import { TourProvider, useTour } from "@reactour/tour";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

interface TourStep {
	selector: string;
	content: {
		header?: string;
		body: string;
	};
	position?: [number, number];
	action?: (setCurrentStep: (step: number) => void) => void;
}

const steps: TourStep[] = [
	{
		selector: isMobile ? '[data-testid="model-dropdown"]' : ".model-selector",
		content: {
			header: "🦠 Choose Disease to model",
			body: "Start by selecting a disease model to visualize. Choose from various infectious diseases like malaria, dengue, or West Nile virus to see how they spread under different climate conditions.",
		},
	},
	{
		selector: '[data-testid="timeline-selector"]',
		content: {
			header: "📅 Timeline Control",
			body: "Use the timeline to explore how disease risk changes over time. Adjust the year and month to see seasonal variations and long-term climate trends.",
		},
	},
];

const TourComponent = () => {
	const { setIsOpen, setCurrentStep, currentStep, isOpen } = useTour();
	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

	useEffect(() => {
		// Check if tour is disabled via URL parameter
		const urlParams = new URLSearchParams(window.location.search);
		const tourDisabled = urlParams.get('notour') === 'true';
		
		// Check if user has seen the tour before
		const hasSeenTour = localStorage.getItem("onehealth-tour-completed");
		
		if (!hasSeenTour && !hasCompletedOnboarding && !tourDisabled) {
			// Wait for page to fully load before starting tour
			const timer = setTimeout(() => {
				setIsOpen(true);
			}, 3000); // Start after loading screen
			return () => clearTimeout(timer);
		}
	}, [setIsOpen, hasCompletedOnboarding]);

	const handleTourComplete = () => {
		localStorage.setItem("onehealth-tour-completed", "true");
		setHasCompletedOnboarding(true);
		setIsOpen(false);
	};

	const handleSkipTour = () => {
		handleTourComplete();
	};

	return null; // This component doesn't render anything itself
};

const OnboardingTour = ({ children }: { children: React.ReactNode }) => {
	return (
		<TourProvider
			steps={steps.map((step, index) => ({
				selector: step.selector,
				content: ({ setCurrentStep, setIsOpen }) => (
					<div className="tour-content">
						{step.content.header && (
							<h3 className="tour-header">{step.content.header}</h3>
						)}
						<p className="tour-body">{step.content.body}</p>
						<div className="tour-actions">
							{index === 0 && (
								<button
									type="button"
									className="tour-button tour-button-secondary"
									onClick={() => {
										localStorage.setItem("onehealth-tour-completed", "true");
										setIsOpen(false);
									}}
								>
									Skip Tour
								</button>
							)}
							{index > 0 && (
								<button
									type="button"
									className="tour-button tour-button-secondary"
									onClick={() => setCurrentStep(index - 1)}
								>
									Back
								</button>
							)}
							{index < steps.length - 1 ? (
								<button
									type="button"
									className="tour-button tour-button-primary"
									onClick={() => {
										if (step.action) {
											step.action(setCurrentStep);
										} else {
											setCurrentStep(index + 1);
										}
									}}
								>
									Next
								</button>
							) : (
								<button
									type="button"
									className="tour-button tour-button-primary"
									onClick={() => {
										localStorage.setItem("onehealth-tour-completed", "true");
										setIsOpen(false);
									}}
								>
									Get Started!
								</button>
							)}
						</div>
					</div>
				),
				position: step.position,
				action: step.action,
			}))}
			onRequestClose={() => {
				localStorage.setItem("onehealth-tour-completed", "true");
			}}
			styles={{
				popover: (base) => ({
					...base,
					"--reactour-accent": "#8b5cf6",
					borderRadius: "12px",
					backgroundColor: "white",
					boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
					maxWidth: "350px",
				}),
				maskArea: (base) => ({
					...base,
					rx: 8,
				}),
				badge: (base) => ({
					...base,
					backgroundColor: "#8b5cf6",
				}),
			}}
			padding={{ mask: 10 }}
			scrollSmooth
			showBadge
			showCloseButton
			showNavigation
			showDots={false}
		>
			<TourComponent />
			{children}
		</TourProvider>
	);
};

export default OnboardingTour;
