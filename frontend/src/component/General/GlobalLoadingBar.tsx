import { observer } from "mobx-react-lite";
import type React from "react";
import { useEffect, useRef } from "react";
import LoadingBar, { type LoadingBarRef } from "react-top-loading-bar";
import { loadingStore } from "../../stores/LoadingStore";

const GlobalLoadingBar: React.FC = observer(() => {
	const ref = useRef<LoadingBarRef>(null);

	useEffect(() => {
		if (loadingStore.isLoading) {
			if (loadingStore.progress === 0) {
				ref.current?.continuousStart();
			} else if (loadingStore.progress === 100) {
				ref.current?.complete();
			}
		}
	}, []);

	return (
		<>
			<style>{`
                .loading-bar {
                    background: linear-gradient(90deg, #00437d 0%, #a2274c 100%) !important;
                }
            `}</style>
			<LoadingBar
				color="#00437d"
				ref={ref}
				shadow={true}
				height={3}
				transitionTime={300}
				className="loading-bar"
				containerClassName="loading-bar-container"
			/>
		</>
	);
});

export default GlobalLoadingBar;
