import React from 'react';
import { motion } from 'framer-motion';

/**
 * BlockLoader - Ultra-modern animated blocks loader tailored for RentFlex's sharp geometric design language.
 *
 * @param {('grid'|'bars'|'inline')} variant - Animation style: 'grid' (2x2 pulsing matrix), 'bars' (equalizer wave), 'inline' (horizontal pulse)
 * @param {('xs'|'sm'|'md'|'lg'|'xl'|'fullscreen')} size - Sizing preset
 * @param {('dark'|'light'|'emerald'|'slate')} color - Color scheme
 * @param {string} text - Optional text below the animated blocks
 * @param {string} className - Additional container styling
 * @param {boolean} fullScreen - Whether to render as fixed full-screen overlay
 */
export default function BlockLoader({
    variant = 'grid',
    size = 'md',
    color = 'dark',
    text,
    className = '',
    fullScreen = false,
}) {
    const colorClasses = {
        dark: 'bg-zinc-900',
        light: 'bg-white',
        emerald: 'bg-emerald-600',
        slate: 'bg-slate-400',
    };

    const blockColor = colorClasses[color] || colorClasses.dark;

    // Grid (2x2 Matrix) Variant
    const renderGrid = () => {
        const sizeMap = {
            xs: 'w-2 h-2',
            sm: 'w-3 h-3',
            md: 'w-4 h-4',
            lg: 'w-5 h-5',
            xl: 'w-7 h-7',
            fullscreen: 'w-6 h-6',
        };
        const gapMap = {
            xs: 'gap-1',
            sm: 'gap-1.5',
            md: 'gap-2',
            lg: 'gap-2.5',
            xl: 'gap-3',
            fullscreen: 'gap-2.5',
        };

        const bSize = sizeMap[size] || sizeMap.md;
        const bGap = gapMap[size] || gapMap.md;

        // 4 blocks in 2x2 with clockwise staggered scale & opacity wave
        const blocks = [
            { delay: 0 },
            { delay: 0.15 },
            { delay: 0.45 },
            { delay: 0.3 },
        ];

        return (
            <div className={`grid grid-cols-2 ${bGap}`}>
                {blocks.map((b, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [0.45, 1, 0.45],
                            opacity: [0.35, 1, 0.35],
                        }}
                        transition={{
                            duration: 1.1,
                            repeat: Infinity,
                            delay: b.delay,
                            ease: [0.4, 0, 0.2, 1],
                        }}
                        className={`${bSize} ${blockColor}`}
                        style={{ borderRadius: 0 }}
                    />
                ))}
            </div>
        );
    };

    // Bars (Equalizer / Vertical Blocks) Variant
    const renderBars = () => {
        const barHeights = {
            xs: 'w-1 h-3',
            sm: 'w-1.5 h-5',
            md: 'w-2 h-7',
            lg: 'w-3 h-10',
            xl: 'w-4 h-14',
            fullscreen: 'w-3 h-10',
        };
        const gapMap = {
            xs: 'gap-0.5',
            sm: 'gap-1',
            md: 'gap-1.5',
            lg: 'gap-2',
            xl: 'gap-2.5',
            fullscreen: 'gap-2',
        };

        const bSize = barHeights[size] || barHeights.md;
        const bGap = gapMap[size] || gapMap.md;

        const bars = [0, 0.15, 0.3, 0.45];

        return (
            <div className={`flex items-center ${bGap}`}>
                {bars.map((delay, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scaleY: [0.3, 1, 0.3],
                            opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            delay,
                            ease: 'easeInOut',
                        }}
                        className={`${bSize} ${blockColor} origin-center`}
                        style={{ borderRadius: 0 }}
                    />
                ))}
            </div>
        );
    };

    // Inline (3 Horizontal Blocks) Variant
    const renderInline = () => {
        const sizeMap = {
            xs: 'w-1.5 h-1.5',
            sm: 'w-2 h-2',
            md: 'w-2.5 h-2.5',
            lg: 'w-3.5 h-3.5',
            xl: 'w-5 h-5',
            fullscreen: 'w-3 h-3',
        };
        const gapMap = {
            xs: 'gap-1',
            sm: 'gap-1.5',
            md: 'gap-2',
            lg: 'gap-2.5',
            xl: 'gap-3',
            fullscreen: 'gap-2',
        };

        const bSize = sizeMap[size] || sizeMap.sm;
        const bGap = gapMap[size] || gapMap.sm;

        return (
            <div className={`inline-flex items-center ${bGap}`}>
                {[0, 0.18, 0.36].map((delay, i) => (
                    <motion.span
                        key={i}
                        animate={{
                            scale: [0.5, 1.1, 0.5],
                            opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay,
                            ease: 'easeInOut',
                        }}
                        className={`${bSize} ${blockColor} inline-block`}
                        style={{ borderRadius: 0 }}
                    />
                ))}
            </div>
        );
    };

    const content = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            {variant === 'bars' && renderBars()}
            {variant === 'inline' && renderInline()}
            {variant === 'grid' && renderGrid()}
            {text && (
                <motion.p
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className={`font-semibold tracking-wider uppercase ${
                        size === 'xs' || size === 'sm'
                            ? 'text-[10px]'
                            : size === 'lg' || size === 'xl' || size === 'fullscreen'
                            ? 'text-xs tracking-widest'
                            : 'text-[11px]'
                    } ${color === 'light' ? 'text-zinc-300' : 'text-zinc-600'}`}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );

    if (fullScreen || size === 'fullscreen') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f7f8]/90 backdrop-blur-sm">
                {content}
            </div>
        );
    }

    return content;
}
