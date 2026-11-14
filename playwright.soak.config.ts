import {defineConfig} from '@playwright/test';import base from './playwright.config.ts';
export default defineConfig({...base,testDir:'./tests/soak',timeout:1000000});
