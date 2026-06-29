/* Studio 27 — canonical task/job labels.
   Single source of truth shared across Productie (taken) and CRM (taak templates).
   Any portal that lets you hang a label on a task reads from here. */
(function(){
  var LIST = ['Webdesign','Copywriting','SEO','hosting','FB-Webdesign','Branding','FB-Branding','Strategie','Preproductie','Shoot','UGC-Shoot','Edit','FB-Edit','Social media','Adverteren','Automation','Opleiding','Support','Projectmanagement'];
  var COLORS = {
    'Webdesign':'#2458EA','Copywriting':'#0F2EA3','SEO':'#28AFF9','hosting':'#6E8BF5',
    'FB-Webdesign':'#1D58FF','Branding':'#B0432F','FB-Branding':'#C4624D','Strategie':'#7E9A55',
    'Preproductie':'#C99410','Shoot':'#A9750C','UGC-Shoot':'#D1A23A','Edit':'#9A6B0C','FB-Edit':'#B3863A',
    'Social media':'#4A6B0E','Adverteren':'#0F8A5B','Automation':'#0E7C86','Opleiding':'#6E8BF5',
    'Support':'#8E8979','Projectmanagement':'#5E5A4F'
  };
  if(typeof window!=='undefined'){ window.S27_JOBLABELS = { list: LIST, colors: COLORS }; }
})();
