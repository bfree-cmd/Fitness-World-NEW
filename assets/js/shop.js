(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-shop-product]');
    if (!link) return;
    var detail = {
      product_offer: link.getAttribute('data-shop-product'),
      source_page: '/shop/',
      source_form: 'Shop: ' + link.textContent.trim(),
      capture_source: 'Shop',
      notes: 'Shop product: ' + link.getAttribute('data-shop-key') + ' | Destination: ' + link.getAttribute('href'),
      __beacon: true
    };
    if (window.FWEventTracking) window.FWEventTracking.send('cta_click', detail);
    if (typeof window.gtag === 'function') window.gtag('event', 'shop_product_click', {
      item_id: link.getAttribute('data-shop-key'), item_name: detail.product_offer,
      link_url: link.href, button_text: link.textContent.trim()
    });
  });
})();
