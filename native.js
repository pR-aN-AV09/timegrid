/* Bridge to the Android alarm plugin. Does nothing in a normal browser. */
(function(){
  const C=window.Capacitor;
  const isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  let P=null;
  // No build step, so @capacitor/core (registerPlugin) isn't loaded; native plugins are on Capacitor.Plugins.
  if(isNative){try{P=(C.Plugins&&C.Plugins.TimegridAlarm)||(C.registerPlugin&&C.registerPlugin('TimegridAlarm'))||null}catch(e){P=null}}
  const call=async(fn,arg)=>{if(!P||!P[fn])throw new Error('native plugin missing: '+fn);return P[fn](arg||{})};
  window.TGNative={
    available:!!P,
    schedule:alarms=>call('schedule',{alarms}),
    cancelAll:()=>call('cancelAll'),
    getStatus:()=>call('getStatus'),
    openSettings:page=>call('openSettings',{page}),
    requestNotifications:()=>call('requestNotifications'),
    pickSound:()=>call('pickSound'),
    testAlarm:delaySeconds=>call('testAlarm',{delaySeconds:delaySeconds||10})
  };
})();
