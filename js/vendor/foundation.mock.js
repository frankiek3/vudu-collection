(function($, window, document) {
  $(document).on('click', '.toggle-topbar', function(e) {
    e.preventDefault();
    $('.top-bar').toggleClass('expanded');
  });
  
}(jQuery, this, this.document));
