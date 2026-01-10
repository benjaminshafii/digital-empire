import { useState, useEffect } from "react";
import { SofaScene } from "./components/SofaScene";
import { Controls } from "./components/Controls";
import { findPath, RoomConfig, PathNode } from "./sim/planner";

function App() {
  const [config, setConfig] = useState<RoomConfig>({
    couchLength: 2.26,
    couchWidth: 0.85,
    hallwayWidth: 1.1,
    doorWidth: 0.87,
    hallwayLength: 4.0,
    roomWidth: 3.5,
    roomDepth: 3.5,
  });

  const [path, setPath] = useState<PathNode[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [planResult, setPlanResult] = useState<{ success: boolean; reason?: string } | null>(
    null
  );

  const handlePlan = () => {
    setIsPlanning(true);
    setCurrentIndex(-1);
    setPlanResult(null);

    // Small delay to allow UI update
    setTimeout(() => {
      const result = findPath(config, []);

      if (result.success && result.path.length > 0) {
        setPath(result.path);
        setCurrentIndex(0);
        setPlanResult({ success: true });
      } else {
        setPath([]);
        setCurrentIndex(-1);
        setPlanResult({ success: false, reason: result.reason });
      }

      setIsPlanning(false);
    }, 100);
  };

  const handleAnimate = () => {
    if (path.length === 0 || currentIndex < 0) return;

    setIsAnimating(true);

    let i = 0;
    const animateStep = () => {
      if (i < path.length) {
        setCurrentIndex(i);
        i++;
        setTimeout(animateStep, 200); // 200ms per step
      } else {
        setIsAnimating(false);
      }
    };

    animateStep();
  };

  const handleReset = () => {
    setPath([]);
    setCurrentIndex(-1);
    setPlanResult(null);
  };

  // Auto-plan on config change if there's already a plan
  useEffect(() => {
    if (path.length > 0 && !isPlanning) {
      handlePlan();
    }
  }, [config]);

  return (
    <div className="container">
      <SofaScene
        config={config}
        path={path}
        currentIndex={currentIndex}
      />

      <div className="controls-container">
        {planResult && (
          <div className={`status ${planResult.success ? "success" : "failure"}`}>
            <h3>
              {planResult.success
                ? "✓ Path Found!"
                : "✗ Cannot Fit Through"}
            </h3>
            {!planResult.success && planResult.reason && (
              <p>{planResult.reason}</p>
            )}
          </div>
        )}
        <Controls
          config={config}
          onConfigChange={setConfig}
          onPlan={handlePlan}
          onAnimate={handleAnimate}
          onReset={handleReset}
          isPlanning={isPlanning}
          isAnimating={isAnimating}
          canAnimate={path.length > 0}
        />
      </div>
    </div>
  );
}

export default App;
