import React from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  if (!isLoading) {
    return null;
  }

  const totalBananas = 6;
  const animationDuration = 6; // seconds

  return (
    <div className={`loading-screen-overlay ${isLoading ? 'visible' : 'hidden'}`}>
      <div className="animation-centerpoint">
        <img 
          src="/images/googly_monkey.png" 
          alt="Loading..." 
          className="loading-monkey" 
        />
        <div className="banana-orbit-container">
          {[...Array(totalBananas)].map((_, index) => (
            <img
              key={index}
              src="/images/banana.png"
              alt="banana"
              className="banana"
              style={{
                animationDelay: `-${(animationDuration / totalBananas) * index}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style jsx global>{`
        .loading-screen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgb(34, 139, 34); /* Solid Forest Green */
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
          opacity: 0;
          visibility: hidden;
        }
        .loading-screen-overlay.visible {
          opacity: 1;
          visibility: visible;
        }
        .animation-centerpoint {
          position: relative;
          width: 280px; /* Adjust as needed, orbit radius is based on this and banana translate */
          height: 280px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .loading-monkey {
          width: 150px;
          height: auto;
          object-fit: contain;
          position: relative;
          z-index: 10;
        }
        .banana-orbit-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          /* Removed animation from container */
          z-index: 5;
          transform-origin: center center; 
        }
        .banana {
          position: absolute;
          width: 45px; /* Banana size */
          height: auto;
          object-fit: contain;
          /* Start bananas in the center of the orbit container before animation moves them */
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%); /* Center the banana itself */
          animation-name: orbitAroundMonkey;
          animation-duration: ${animationDuration}s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          backface-visibility: hidden; /* Can sometimes help with smoothing */
        }

        /* 
          Keyframes for individual banana orbit.
          The banana starts centered in its parent (.banana-orbit-container).
          We want it to orbit around the center of .animation-centerpoint.
          The orbit radius will be roughly half the width/height of .animation-centerpoint minus half banana width.
          Let's target an orbit radius of about 100px.
          Each keyframe step will:
          1. Rotate the banana to keep it pointing outwards (optional, but looks good)
          2. Translate it outwards to the orbit radius
          3. The translate needs to be rotated around the circle
        */
        @keyframes orbitAroundMonkey {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(100px) rotate(0deg);
          }
          12.5% { /* Adding more steps for potentially smoother interpolation */
            transform: translate(-50%, -50%) rotate(45deg) translateX(100px) rotate(-45deg);
          }
          25% {
            transform: translate(-50%, -50%) rotate(90deg) translateX(100px) rotate(-90deg);
          }
          37.5% {
            transform: translate(-50%, -50%) rotate(135deg) translateX(100px) rotate(-135deg);
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg) translateX(100px) rotate(-180deg);
          }
          62.5% {
            transform: translate(-50%, -50%) rotate(225deg) translateX(100px) rotate(-225deg);
          }
          75% {
            transform: translate(-50%, -50%) rotate(270deg) translateX(100px) rotate(-270deg);
          }
          87.5% {
            transform: translate(-50%, -50%) rotate(315deg) translateX(100px) rotate(-315deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(100px) rotate(-360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen; 