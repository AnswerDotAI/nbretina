define([
  "notebook/js/textcell","base/js/markdown"
], function(textcell, markdown) {
    function patchMdRender() {
      textcell.MarkdownCell.prototype.render = function () {
        this.drag_counter = 0;
        this.inner_cell.removeClass('dropzone');
        var cont = textcell.TextCell.prototype.render.apply(this);
        if (!cont) return;
        var that = this;
        markdown.render(this.get_text() || this.placeholder,
            { with_math: true, clean_tables: true, sanitize: true },
            function (err, html) {
              // add anchors to headings
              html.find(":header").addBack(":header").each(function (i, h) {
                  h = $(h);
                  var hash = h.text().replace(/ /g, '-');
                  h.attr('id', hash);
                  h.append(
                      $('<a/>')
                          .addClass('anchor-link')
                          .attr('href', '#' + hash)
                          .text('¶')
                          .on('click',function(){
                              setTimeout(function(){that.unrender(); that.render()}, 100)
                          })
                  );
              });
              // links in markdown cells should open in new tabs
              html.find("a[href]").not('[href^="#"]').attr("target", "_blank");
              html.find('img[src^="attachment:"]').each(function (i, h) {
                  h = $(h);
                  var key = h.attr('src').replace(/^attachment:/, '');
                  if (that.attachments.hasOwnProperty(key)) {
                      var att = that.attachments[key];
                      var mime = Object.keys(att)[0];
                      h.attr('srcset', `data:${mime};base64,${att[mime]} 2x`);
                      var attrs = h.parent().text().match(/\{(.+?)\}/);
                      if (attrs) {
                          var attrString = attrs[1];
                          var regex = /(\w+)=(?:"([^"]*)"|([\w%]+))/g;
                          var match;
                          while ((match = regex.exec(attrString)) !== null) {
                              var key = match[1];
                              var value = match[2] || match[3];
                              h.attr(key, value);
                          }
                      }
                      h.parent().contents().filter(
                          (_, el) => el.nodeType === 3 && el.nodeValue.trim().match(/^\{.*\}$/)
                      ).remove();
                  } else h.attr('src', '');
              });
              that.set_rendered(html);
              that.typeset();
              that.events.trigger("rendered.MarkdownCell", {cell: that});
          });
        return cont;
      };
    }

    function reRenderAllMarkdownCells() {
      Jupyter.notebook.events.on('kernel_ready.Kernel', () => {
        Jupyter.notebook.get_cells().forEach(cell => {
          if (cell.cell_type === 'markdown' && /!.*\(\s*attachment:/g.test(cell.get_text())) {
            cell.unrender();
            cell.render();
          }
        });
      });
    }

    function load_ipython_extension() {
        patchMdRender();
        reRenderAllMarkdownCells();
    }

    return { load_ipython_extension: load_ipython_extension };
});

