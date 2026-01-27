import {
    ISeriesPrimitive,
    ISeriesPrimitivePaneRenderer,
    ISeriesPrimitivePaneView,
    SeriesPrimitivePaneViewZOrder,
    Time,
    ISeriesApi,
    Coordinate,
    SeriesAttachedParameter,
    IChartApi,
} from 'lightweight-charts';

export interface PositionToolData {
    id: string;
    type: 'long' | 'short';
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    size: number;
    showRiskReward?: boolean;
    // Time-based parameters
    startTime: number; // Unix timestamp
    candleCount: number; // How many candles forward to extend (e.g., 20)
}

interface PositionViewData {
    entryY: Coordinate | null;
    slY: Coordinate | null;
    tpY: Coordinate | null;
    type: 'long' | 'short';
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    size: number;
    showRiskReward: boolean;
    // X coordinates for time-based rendering
    startX: Coordinate | null;
    endX: Coordinate | null;
}

class PositionPrimitivePaneRenderer implements ISeriesPrimitivePaneRenderer {
    private _data: PositionViewData;

    constructor(data: PositionViewData) {
        this._data = data;
    }

    draw(target: { useBitmapCoordinateSpace: (callback: (scope: { context: CanvasRenderingContext2D; bitmapSize: { width: number; height: number }; horizontalPixelRatio: number; verticalPixelRatio: number }) => void) => void }): void {
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;
            const { entryY, slY, tpY, type, entryPrice, stopLoss, takeProfit, size, showRiskReward, startX, endX } = this._data;
            const vRatio = scope.verticalPixelRatio;
            const hRatio = scope.horizontalPixelRatio;

            if (entryY === null || startX === null) return;

            const scaledEntryY = Math.round(entryY * vRatio);
            const scaledSlY = slY !== null ? Math.round(slY * vRatio) : null;
            const scaledTpY = tpY !== null ? Math.round(tpY * vRatio) : null;

            // X coordinates for time-based rendering
            const scaledStartX = Math.round(startX * hRatio);
            const scaledEndX = endX !== null ? Math.round(endX * hRatio) : scope.bitmapSize.width - Math.round(50 * hRatio);
            const width = scaledEndX - scaledStartX;

            const isLong = type === 'long';
            const profitColor = 'rgba(0, 200, 83, 0.18)';
            const lossColor = 'rgba(255, 82, 82, 0.18)';
            const entryLineColor = isLong ? '#00c853' : '#ff5252';
            const slLineColor = '#ff5252';
            const tpLineColor = '#00c853';

            // Draw Profit Area (Entry to TP)
            if (scaledTpY !== null && takeProfit !== null) {
                const topY = Math.min(scaledEntryY, scaledTpY);
                const height = Math.abs(scaledTpY - scaledEntryY);
                ctx.fillStyle = profitColor;
                ctx.fillRect(scaledStartX, topY, width, height);
            }

            // Draw Loss Area (Entry to SL)
            if (scaledSlY !== null && stopLoss !== null) {
                const topY = Math.min(scaledEntryY, scaledSlY);
                const height = Math.abs(scaledSlY - scaledEntryY);
                ctx.fillStyle = lossColor;
                ctx.fillRect(scaledStartX, topY, width, height);
            }

            // Draw Entry Line
            ctx.strokeStyle = entryLineColor;
            ctx.lineWidth = Math.round(2 * hRatio);
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(scaledStartX, scaledEntryY);
            ctx.lineTo(scaledEndX, scaledEntryY);
            ctx.stroke();

            // Draw SL Line (dashed)
            if (scaledSlY !== null) {
                ctx.strokeStyle = slLineColor;
                ctx.lineWidth = Math.round(1.5 * hRatio);
                ctx.setLineDash([Math.round(6 * hRatio), Math.round(4 * hRatio)]);
                ctx.beginPath();
                ctx.moveTo(scaledStartX, scaledSlY);
                ctx.lineTo(scaledEndX, scaledSlY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Draw TP Line (dashed)
            if (scaledTpY !== null) {
                ctx.strokeStyle = tpLineColor;
                ctx.lineWidth = Math.round(1.5 * hRatio);
                ctx.setLineDash([Math.round(6 * hRatio), Math.round(4 * hRatio)]);
                ctx.beginPath();
                ctx.moveTo(scaledStartX, scaledTpY);
                ctx.lineTo(scaledEndX, scaledTpY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Draw vertical lines at start and end
            ctx.strokeStyle = entryLineColor;
            ctx.lineWidth = Math.round(1 * hRatio);
            ctx.setLineDash([]);

            // Left vertical line
            const topMost = Math.min(scaledEntryY, scaledSlY ?? scaledEntryY, scaledTpY ?? scaledEntryY);
            const bottomMost = Math.max(scaledEntryY, scaledSlY ?? scaledEntryY, scaledTpY ?? scaledEntryY);
            ctx.beginPath();
            ctx.moveTo(scaledStartX, topMost);
            ctx.lineTo(scaledStartX, bottomMost);
            ctx.stroke();

            // Right vertical line
            ctx.beginPath();
            ctx.moveTo(scaledEndX, topMost);
            ctx.lineTo(scaledEndX, bottomMost);
            ctx.stroke();

            // Draw Risk/Reward Info Box
            if (showRiskReward && stopLoss !== null && takeProfit !== null) {
                const risk = Math.abs(entryPrice - stopLoss);
                const reward = Math.abs(takeProfit - entryPrice);
                const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : '∞';

                const pipMultiplier = 10000;
                const riskPips = (risk * pipMultiplier).toFixed(1);
                const rewardPips = (reward * pipMultiplier).toFixed(1);

                // Box dimensions scaled - position at the start
                const boxX = scaledStartX + Math.round(5 * hRatio);
                const boxY = scaledEntryY - Math.round(65 * vRatio);
                const boxWidth = Math.round(150 * hRatio);
                const boxHeight = Math.round(55 * vRatio);

                // Draw box background with rounded corners
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.beginPath();
                const radius = Math.round(8 * hRatio);
                ctx.moveTo(boxX + radius, boxY);
                ctx.lineTo(boxX + boxWidth - radius, boxY);
                ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
                ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
                ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
                ctx.lineTo(boxX + radius, boxY + boxHeight);
                ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
                ctx.lineTo(boxX, boxY + radius);
                ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
                ctx.closePath();
                ctx.fill();

                // Draw border
                ctx.strokeStyle = entryLineColor;
                ctx.lineWidth = Math.round(1 * hRatio);
                ctx.stroke();

                // Draw text
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(12 * hRatio)}px Inter, sans-serif`;
                ctx.textAlign = 'left';

                const typeLabel = isLong ? 'LONG' : 'SHORT';
                ctx.fillText(`${typeLabel} | ${size}`, boxX + Math.round(12 * hRatio), boxY + Math.round(18 * vRatio));

                ctx.font = `${Math.round(10 * hRatio)}px Inter, sans-serif`;
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`Risk: ${riskPips} pips`, boxX + Math.round(12 * hRatio), boxY + Math.round(32 * vRatio));
                ctx.fillText(`Reward: ${rewardPips} pips`, boxX + Math.round(12 * hRatio), boxY + Math.round(46 * vRatio));

                // R:R Badge
                const rrBadgeX = boxX + boxWidth - Math.round(50 * hRatio);
                const rrBadgeY = boxY + Math.round(10 * vRatio);
                const rrBadgeWidth = Math.round(40 * hRatio);
                const rrBadgeHeight = Math.round(20 * vRatio);

                const rrValue = parseFloat(rrRatio);
                ctx.fillStyle = rrValue >= 1 ? 'rgba(0, 200, 83, 0.25)' : 'rgba(255, 82, 82, 0.25)';
                ctx.beginPath();
                const badgeRadius = Math.round(4 * hRatio);
                ctx.moveTo(rrBadgeX + badgeRadius, rrBadgeY);
                ctx.lineTo(rrBadgeX + rrBadgeWidth - badgeRadius, rrBadgeY);
                ctx.quadraticCurveTo(rrBadgeX + rrBadgeWidth, rrBadgeY, rrBadgeX + rrBadgeWidth, rrBadgeY + badgeRadius);
                ctx.lineTo(rrBadgeX + rrBadgeWidth, rrBadgeY + rrBadgeHeight - badgeRadius);
                ctx.quadraticCurveTo(rrBadgeX + rrBadgeWidth, rrBadgeY + rrBadgeHeight, rrBadgeX + rrBadgeWidth - badgeRadius, rrBadgeY + rrBadgeHeight);
                ctx.lineTo(rrBadgeX + badgeRadius, rrBadgeY + rrBadgeHeight);
                ctx.quadraticCurveTo(rrBadgeX, rrBadgeY + rrBadgeHeight, rrBadgeX, rrBadgeY + rrBadgeHeight - badgeRadius);
                ctx.lineTo(rrBadgeX, rrBadgeY + badgeRadius);
                ctx.quadraticCurveTo(rrBadgeX, rrBadgeY, rrBadgeX + badgeRadius, rrBadgeY);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = rrValue >= 1 ? '#00c853' : '#ff5252';
                ctx.font = `bold ${Math.round(11 * hRatio)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(`1:${rrRatio}`, rrBadgeX + rrBadgeWidth / 2, rrBadgeY + Math.round(14 * vRatio));
            }
        });
    }
}

class PositionPrimitivePaneView implements ISeriesPrimitivePaneView {
    private _source: PositionPrimitive;

    constructor(source: PositionPrimitive) {
        this._source = source;
    }

    zOrder(): SeriesPrimitivePaneViewZOrder {
        return 'bottom';
    }

    renderer(): ISeriesPrimitivePaneRenderer | null {
        const data = this._source.getViewData();
        if (!data) return null;
        return new PositionPrimitivePaneRenderer(data);
    }
}

export class PositionPrimitive implements ISeriesPrimitive<Time> {
    private _data: PositionToolData | null = null;
    private _series: ISeriesApi<'Candlestick'> | null = null;
    private _chart: IChartApi | null = null;
    private _paneView: PositionPrimitivePaneView;
    private _requestUpdate: (() => void) | null = null;

    constructor() {
        this._paneView = new PositionPrimitivePaneView(this);
    }

    attached(params: SeriesAttachedParameter<Time>): void {
        this._series = params.series as ISeriesApi<'Candlestick'>;
        this._chart = params.chart;
        this._requestUpdate = params.requestUpdate;
    }

    detached(): void {
        this._series = null;
        this._chart = null;
        this._requestUpdate = null;
    }

    paneViews(): ISeriesPrimitivePaneView[] {
        return [this._paneView];
    }

    updateAllViews(): void {
        // Called by library when needing a redraw
    }

    setData(data: PositionToolData): void {
        this._data = data;
        this._requestUpdate?.();
    }

    getData(): PositionToolData | null {
        return this._data;
    }

    getViewData(): PositionViewData | null {
        if (!this._data || !this._series || !this._chart) return null;

        const entryY = this._series.priceToCoordinate(this._data.entryPrice);
        const slY = this._data.stopLoss ? this._series.priceToCoordinate(this._data.stopLoss) : null;
        const tpY = this._data.takeProfit ? this._series.priceToCoordinate(this._data.takeProfit) : null;

        // Get X coordinates from time
        const timeScale = this._chart.timeScale();
        const startX = timeScale.timeToCoordinate(this._data.startTime as Time);

        // Calculate end time based on candle count (assuming 1 hour candles = 3600 seconds)
        // This is a rough estimate; actual implementation would need timeframe info
        const candleDuration = 3600; // 1 hour in seconds
        const endTime = this._data.startTime + (this._data.candleCount * candleDuration);
        const endX = timeScale.timeToCoordinate(endTime as Time);

        return {
            entryY,
            slY,
            tpY,
            type: this._data.type,
            entryPrice: this._data.entryPrice,
            stopLoss: this._data.stopLoss,
            takeProfit: this._data.takeProfit,
            size: this._data.size,
            showRiskReward: this._data.showRiskReward ?? true,
            startX,
            endX,
        };
    }
}
