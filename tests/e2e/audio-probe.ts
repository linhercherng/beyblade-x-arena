export async function installProbe(page:import('@playwright/test').Page){
  await page.addInitScript(()=>{
    const original=window.AudioContext;
    (window as any).AudioContext=class extends original{
      constructor(...args:ConstructorParameters<typeof AudioContext>){
        super(...args);const ctx=this,createGain=this.createGain.bind(this),createSource=this.createBufferSource.bind(this),sources=new Set<AudioBufferSourceNode>();
        let analyser:AnalyserNode,master:GainNode;
        this.createGain=()=>{const gain=createGain();if(!master){master=gain;analyser=ctx.createAnalyser();master.connect(analyser);}return gain;};
        this.createBufferSource=()=>{const source=createSource(),disconnect=source.disconnect.bind(source);sources.add(source);source.addEventListener('ended',()=>sources.delete(source));source.disconnect=()=>{sources.delete(source);disconnect();};return source;};
        (window as any).audioProbe={ctx,metrics:()=>{const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);return {state:ctx.state,master:master.gain.value,loops:[...sources].filter(s=>s.loop).length,rms:Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length)};}};
      }
    };
  });
}
