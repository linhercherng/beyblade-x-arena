export type AudioStatus='ready'|'waiting'|'recovering'|'retry'|'interrupted'|'muted'|'unavailable'|'closed'|'music-error';
export const AUDIO_STATUS:Record<AudioStatus,{label:string;hint:string}>={
 ready:{label:'音訊正常',hint:'音效與配樂可使用。'},waiting:{label:'等待操作啟用音訊',hint:'點按繼續，或按重試音訊。'},recovering:{label:'音訊恢復中',hint:'正在重新連接，請稍候。'},retry:{label:'音訊尚未恢復',hint:'請按重試音訊，再確認是否有聲音。'},interrupted:{label:'音訊中斷中',hint:'通話或其他音訊中斷結束後，再繼續遊戲。'},muted:{label:'音效已關閉',hint:'目前為全域靜音，可用音效開關啟用。'},unavailable:{label:'此瀏覽器無法播放音訊',hint:'遊戲仍可操作。'},closed:{label:'此頁音訊已關閉',hint:'重新載入遊戲後可再次啟用。'},'music-error':{label:'音效正常，配樂載入失敗',hint:'按重試音訊重新載入配樂。'}
};
export function audioStatus(s:{available:boolean;muted:boolean;context:string|null;sessionInterrupted:boolean;background:boolean;recovering:boolean;resumeAge:number|null;rejected:boolean;musicFailed:boolean}):AudioStatus{
 if(!s.available)return'unavailable';if(s.sessionInterrupted)return'interrupted';if(s.muted)return'muted';if(s.context==='closed')return'closed';
 if(!s.context||s.background)return'waiting';
 if(s.recovering||s.context!=='running'){
  if(s.rejected||s.resumeAge!==null&&s.resumeAge>=1500)return'retry';
  return s.resumeAge!==null?'recovering':'waiting';
 }
 return s.musicFailed?'music-error':'ready';
}
