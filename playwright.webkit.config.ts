import {defineConfig} from '@playwright/test';
import base from './playwright.config.ts';
export default defineConfig({
  ...base,
  testMatch:'**/safari*.spec.ts',
  use:{...base.use,browserName:'webkit',channel:undefined,launchOptions:{},hasTouch:true,isMobile:true,viewport:{width:390,height:1080}},
});
