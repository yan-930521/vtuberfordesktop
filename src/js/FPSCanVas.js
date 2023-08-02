(() => {
    const FPSCanVas = document.createElement('canvas');

    FPSCanVas.width = 200;
    FPSCanVas.height = 100;
    FPSCanVas.style.position = 'absolute';
    FPSCanVas.style.top = '10px';
    FPSCanVas.style.left = '10px';
    FPSCanVas.style.zIndex = '999'
    FPSCanVas.style.display = "none";

    document.body.appendChild(FPSCanVas);

    const updateFPS = () => {
        let fps = Math.round(1 / delta); // 計算當前幀數
        ctx.clearRect(0, 0, FPSCanVas.width, FPSCanVas.height); // 清空畫布
        ctx.font = `bold 30px sans-serif`;
        ctx.fillText("FPS " + fps, FPSCanVas.width / 10, FPSCanVas.height / 2); // 繪製文本
    }
    
    setInterval(updateFPS, 1000);
})();