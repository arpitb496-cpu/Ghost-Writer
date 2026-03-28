import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

export const DynamicBackground = () => {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const options: ISourceOptions = {
        background: {
            color: {
                value: "transparent",
            },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                onClick: { enable: true, mode: "push" },
                onHover: { enable: true, mode: "repulse" },
            },
            modes: {
                push: { quantity: 4 },
                repulse: { distance: 120, duration: 0.4 },
            },
        },
        particles: {
            color: {
                // Vibrant gold to contrast beautifully against the dark grainy monochrome gradient
                value: "#c9a84c", 
            },
            links: {
                color: "#c9a84c",
                distance: 140,
                enable: true,
                opacity: 0.15,
                width: 1,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: { default: "bounce" },
                random: false,
                speed: 0.8,
                straight: false,
            },
            number: {
                density: { enable: true },
                value: 80, 
            },
            opacity: {
                value: { min: 0.2, max: 0.6 },
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 1, max: 2.5 },
            },
        },
        detectRetina: true,
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            zIndex: 0,
            pointerEvents: 'auto', // allows clicking/hovering empty spaces for particles
            backgroundColor: '#030303',
        }}>
            {/* The sweeping monochrome fluid gradients (darkened to let gold pop) */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
            <div className="blob blob-4"></div>
            
            {/* Cinematic Film Grain Overlay */}
            <div className="noise-overlay"></div>

            {/* tsParticles Interactive Network */}
            {init && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                    <Particles id="tsparticles" options={options} />
                </div>
            )}
            
            <style>{`
                .blob {
                    position: absolute;
                    filter: blur(120px);
                    animation: moveBlob infinite alternate ease-in-out;
                    opacity: 0.45; /* Softened intensity */
                }
                
                .blob-1 {
                    width: 90vw;
                    height: 50vh;
                    background: #a3a3a3;
                    top: -10vh;
                    left: -10vw;
                    border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
                    animation-duration: 25s;
                }
                
                .blob-2 {
                    width: 60vw;
                    height: 80vh;
                    background: #2a2a2a;
                    bottom: -20vh;
                    right: -10vw;
                    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
                    animation-duration: 28s;
                    animation-delay: -5s;
                }
                
                .blob-3 {
                    width: 80vw;
                    height: 60vh;
                    background: #0d0d0d;
                    bottom: 10vh;
                    left: 10vw;
                    border-radius: 50% 50% 30% 70% / 50% 50% 70% 30%;
                    animation-duration: 32s;
                    animation-delay: -10s;
                }
                
                .blob-4 {
                    width: 50vw;
                    height: 50vh;
                    background: #555555;
                    top: 20vh;
                    right: 20vw;
                    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
                    animation-duration: 22s;
                    animation-delay: -15s;
                }

                @keyframes moveBlob {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { transform: translate(8vw, 15vh) scale(1.1) rotate(5deg); }
                    66% { transform: translate(-10vw, 8vh) scale(0.9) rotate(-5deg); }
                    100% { transform: translate(12vw, -12vh) scale(1.05) rotate(2deg); }
                }

                .noise-overlay {
                    position: absolute;
                    inset: -100px;
                    opacity: 0.65; /* Heavy but cinematic grain */
                    mix-blend-mode: overlay;
                    pointer-events: none;
                    z-index: 1; /* Sits beneath the particles so particles stay crisp */
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
            `}</style>
        </div>
    );
};
