import { test, expect } from "@playwright/test";
import{mkdirSync,writeFileSync}from'node:fs';
test.use({ deviceScaleFactor: 2 });
test("高畫素大畫布不超過像素預算，縮放後維持正確畫面比例", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).maxArenaPixels = 0;
    (window as any).resolutionDraw={count:0,width:0,height:0};
    for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
      const draw=(WebGL2RenderingContext.prototype as any)[name];
      (WebGL2RenderingContext.prototype as any)[name]=function(...args:any[]){const value=draw.apply(this,args);if(!this.isContextLost()&&this.getParameter(this.FRAMEBUFFER_BINDING)===null){const w=window as any;w.resolutionDraw={count:w.resolutionDraw.count+1,width:this.canvas.width,height:this.canvas.height};}return value;};
    }
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = type.prototype.viewport;
      type.prototype.viewport = function (...args) {
        (window as any).maxArenaPixels = Math.max(
          (window as any).maxArenaPixels,
          this.canvas.width * this.canvas.height,
        );
        return original.apply(this, args);
      };
    }
  });
  const action = (a: string) => page.locator(`[data-action="${a}"]`);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize(process.env.CI?{width:640,height:480}:{ width: 1440, height: 1000 });
  await page.goto("/");
  await action("play").first().click();
  await action("quick").click();
  await action("confirm-team").click();
  await action("begin-match").click();
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "battle", {
    timeout: 12000,
  });
  if(process.env.CI){await action('pause').first().click();await expect(page.locator('#pause-overlay')).toBeVisible();}
  mkdirSync('artifacts',{recursive:true});const samples:unknown[]=[];
  const canvas = page.locator("#stage canvas");
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 3840, height: 2160 },
    { width: 390, height: 844 },
  ]) {
    const before=await page.evaluate(()=>(window as any).resolutionDraw.count);
    await page.setViewportSize(size);
    await expect
      .poll(async()=>{
        const m=await canvas.evaluate(c=>({cssWidth:c.getBoundingClientRect().width,parentWidth:c.parentElement!.clientWidth,styleWidth:(c as HTMLCanvasElement).style.width,bufferWidth:(c as HTMLCanvasElement).width,bufferHeight:(c as HTMLCanvasElement).height,viewport:[innerWidth,innerHeight],draw:(window as any).resolutionDraw}));
        samples.push({requested:size,before,...m});writeFileSync(`artifacts/resolution-${process.env.CI?'software':'native'}-v0430.json`,JSON.stringify({scope:process.env.CI?'paused-resize-and-redraw':'active-resize',samples},null,2));return Math.abs(m.cssWidth-m.parentWidth);
      })
      .toBeLessThan(1);
    await expect
      .poll(() =>
        canvas.evaluate(
          (c) =>
            (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height,
        ),
      )
      .toBeLessThanOrEqual(2400000);
    const metrics = await canvas.evaluate((c) => {
      const el = c as HTMLCanvasElement,
        r = el.getBoundingClientRect();
      return { w: el.width, h: el.height, cssRatio: r.width / r.height };
    });
    expect(metrics.w).toBeGreaterThan(100);
    expect(metrics.h).toBeGreaterThan(100);
    await expect.poll(()=>page.evaluate(({before,w,h})=>{const draw=(window as any).resolutionDraw;return draw.count>before&&draw.width===w&&draw.height===h;},{before,w:metrics.w,h:metrics.h})).toBe(true);
    samples.push({requested:size,before,confirmedDraw:await page.evaluate(()=>(window as any).resolutionDraw),buffer:[metrics.w,metrics.h]});writeFileSync(`artifacts/resolution-${process.env.CI?'software':'native'}-v0430.json`,JSON.stringify({scope:process.env.CI?'paused-resize-and-redraw':'active-resize',samples},null,2));
    expect(Math.abs(metrics.w / metrics.h - metrics.cssRatio)).toBeLessThan(
      0.01,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => (window as any).maxArenaPixels),
  ).toBeLessThanOrEqual(2400000);
});
