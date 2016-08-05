// create a class for our grid
var Grid = function(cell_size, num_cells, cnv, div){
  this.canvas = cnv;
  this.ctx = this.canvas.getContext("2d");
  this.div = div;

  this.cell_size = cell_size;
  this.num_cells = num_cells;
  this.area = this.cell_size * this.num_cells;
  this.coloured_cells = [];

  this.min_x = (this.canvas.width - this.num_cells*this.cell_size)/2;
  this.min_y = (this.canvas.height - this.num_cells*this.cell_size)/2;
  this.max_x = this.min_x + this.num_cells*this.cell_size;
  this.max_y = this.min_y + this.num_cells*this.cell_size;
}

Grid.prototype.inGrid = function(x, y) {
  return x < this.max_x && x >= this.min_x && y < this.max_y && y >= this.min_y;
}

Grid.prototype.reset = function() {
  this.min_x = (this.canvas.width - this.num_cells*this.cell_size)/2;
  this.min_y = (this.canvas.height - this.num_cells*this.cell_size)/2;
  this.max_x = this.min_x + this.num_cells*this.cell_size;
  this.max_y = this.min_y + this.num_cells*this.cell_size;
}

// draw the gridlines
Grid.prototype.drawGridlines = function(cells_to_draw=this.num_cells, minX=this.min_x, minY = this.min_y) {
  maxX = Math.min(this.max_x, minX + cells_to_draw*this.cell_size);
  maxY = Math.min(this.max_y, minY + cells_to_draw*this.cell_size);
  for (i=0; i<=cells_to_draw; i++){
    this.ctx.beginPath();
    this.ctx.setLineDash([this.cell_size/6, this.cell_size/6]);
    this.ctx.strokeStyle = 'gray';
    this.ctx.lineWidth = this.cell_size/80;

    this.ctx.moveTo(minX + i*this.cell_size, minY);
    this.ctx.lineTo(minX + i*this.cell_size, maxY);

    this.ctx.moveTo(minX, minY + i*this.cell_size);
    this.ctx.lineTo(maxX, minY + i*this.cell_size);

    this.ctx.stroke();
    this.ctx.closePath();
  }
}

Grid.prototype.drawDragBox = function(rawX, rawY, width, height) {
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.setLineDash([]);
  this.ctx.strokeStyle = current_colour;
  this.ctx.rect(rawX - this.div.offsetLeft, rawY - this.div.offsetTop, width, height);
  this.ctx.closePath();
  this.ctx.stroke();
  this.ctx.restore();
}

Grid.prototype.colourCell = function(leftX, topY, colour, overall=true) {
  // make sure the click is in the grid
  var changed = false;
  if (this.inGrid(leftX, topY)){
    this.ctx.beginPath();
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(leftX, topY, this.cell_size, this.cell_size);
    this.ctx.closePath();

    if (colour != this.coloured_cells[[leftX, topY]]) changed = true;
    this.coloured_cells[[leftX, topY]] = colour;
    if (overall && changed) drawOverall(leftX, topY);
  }

  return changed;
}

Grid.prototype.eraseCell = function(leftX, topY, overall=true) {
  if (this.inGrid(leftX, topY) && [leftX, topY] in this.coloured_cells) {
    delete this.coloured_cells[[leftX, topY]];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.colourGrid();
    this.drawGridlines();

    eraseOverall(leftX, topY);
  }
}

Grid.prototype.colourGrid = function() {
  for (var coords_string in this.coloured_cells) {
    coords_string = coords_string.split(',');
    var coords = [parseInt(coords_string[0], 10), parseInt(coords_string[1], 10)];
    this.colourCell(coords[0], coords[1], this.coloured_cells[coords_string]);
  }
}

// use a closure to pass the grid to the mouse event handlers
function addClickHandler(grid) {
  document.addEventListener('click', function(e) {
    // need the upper left corner of the cell
    var x = getLeftX(grid, e);
    var y = getTopY(grid, e);

    if (mode === "fill") {
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells));
      var changed = fill(grid, x, y); // this will fill the rest of the area
      if (!changed) previous_grids.pop();
    }

    var fullGridX = getLeftX(fullGrid, e);
    var fullGridY =  getTopY(fullGrid, e);;
    if (fullGrid.inGrid(fullGridX, fullGridY)) {
      moveWorking([fullGridX, fullGridY]);
      moveScrollBars();
    }

    current_colour = $("#colourPicker").spectrum('get').toHexString();
  }, false);

  var drag_started = false;
  var held_down = false;
  var initialX, initialY, rawInitialX, rawInitialY;
  var width, height; // for our drag box

  document.getElementById("vscroll").onmousedown = function() {
    v_scrolling = true;
  };

  document.getElementById("hscroll").onmousedown = function() {
    h_scrolling = true;
  };

  document.addEventListener('mousedown', function(e) {
    initialX = getLeftX(grid, e);
    initialY = getTopY(grid, e);

    if (!drag_started && mode === "box"){
      rawInitialX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      rawInitialY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

      // if our initial click was in the grid
      if (grid.inGrid(initialX, initialY)){
        drag_started = true;
        previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to remove this if the box doesn't actually change anything
      }
    }
    else if (mode === "pen") {
      held_down = true;
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to push a copy, otherwise will pass by reference
      var changed = grid.colourCell(initialX, initialY, current_colour);
      if (!changed) previous_grids.pop();
    }
    else if (mode === "eraser") {
      held_down = true;
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to push a copy, otherwise will pass by reference
      grid.eraseCell(initialX, initialY);
    }
    }, false);

  document.addEventListener('mouseup', function(e) {
    if (v_scrolling || h_scrolling) {
      v_scrolling = false;
      h_scrolling = false;
    }
    if (drag_started){
      grid.ctx.clearRect(0, 0, canvas.width, canvas.height);
      grid.colourGrid();

      // we can leave these as being outside the grid as the call to colourCell will check that they fall withiin the grid
      var finalX = getLeftX(grid, e);
      var finalY = getTopY(grid, e);

      var any_changed = false;
      var current_changed;
      // now we need to colour all the cells we have touched
      for (x=Math.min(initialX, finalX); x<=Math.max(initialX, finalX); x+=grid.cell_size){
        for (y=Math.min(initialY, finalY); y<=Math.max(initialY, finalY); y+=grid.cell_size){
          current_changed = grid.colourCell(x, y, current_colour);
          any_changed = any_changed || current_changed; // so only one of these need to return true for changed to be true overall
        }
      }

      if (!any_changed) previous_grids.pop(); // if nothing changed then don't need to save this grid

      drag_started = false;
      grid.drawGridlines();
    }

    held_down = false;

  }, false);

  document.addEventListener('mousemove', function(e) {
    // now plot our drag box
    if (drag_started) {
      // clear canvas
      grid.ctx.clearRect(0, 0, canvas.width, canvas.height);

      // redraw grid
      grid.colourGrid();

      var currentX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      var currentY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

      // limit currentX and currentY
      if (currentX < grid.min_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft;
      else if (currentX > grid.max_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft + grid.cell_size*grid.num_cells;
      if (currentY < grid.min_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop;
      else if (currentY > grid.max_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop + grid.cell_size*grid.num_cells;

      // update box parameters
      width = currentX - rawInitialX;
      height = currentY - rawInitialY;

      grid.drawDragBox(rawInitialX, rawInitialY, width, height);
      grid.drawGridlines();
    }
    else if(held_down && !v_scrolling && !h_scrolling){
      var x = getLeftX(grid, e);
      var y = getTopY(grid, e);
      if (mode === "pen") {
        grid.colourCell(x, y, current_colour);
        grid.ctx.clearRect(0, 0, grid.canvas.width, grid.canvas.height);
        grid.colourGrid();
        grid.drawGridlines();
      }
      else if (mode === "eraser") grid.eraseCell(x, y);
    }
  }, false);

}


function getLeftX(grid, e) {
  return grid.min_x + grid.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - grid.div.offsetLeft - grid.min_x)/grid.cell_size);
}

function getTopY(grid, e) {
  return grid.min_y + grid.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - grid.div.offsetTop - grid.min_y)/grid.cell_size);
}


// this is to tell if an array of arrays contains an array
function contains(arr, elem) {
  for (i=0; i<arr.length; i++){
    var match = true;
    for (j=0; j<arr[i].length; j++){
      if (arr[i][j] != elem[j]) match = false;
    }
    if (match) return true;
  }
  return false;
}

// returns an array containing the adjacent cells to cell (x, y)
function neighbours(grid, x, y) {
  var nbours = [];
  if (x > grid.min_x) nbours.push([x-grid.cell_size, y]);
  if (x < grid.max_x-grid.cell_size) nbours.push([x+grid.cell_size, y]);
  if (y > grid.min_y) nbours.push([x, y-grid.cell_size]);
  if (y < grid.max_y-grid.cell_size) nbours.push([x, y+grid.cell_size]);

  return nbours;
}

function fill(grid, x, y) {
  var changed = false;
  if (grid.inGrid(x, y)){
    var colour = grid.coloured_cells[[x, y]];

    if (colour != current_colour) changed = true;

    if (changed){
      grid.ctx.clearRect(0, 0, grid.canvas.width, grid.canvas.height);
      grid.colourGrid();
      var to_colour = [[x, y]], visited = [[x, y]]; // will add [x, y] coords to these

      // basically need to perform dijkstra's
      var unvisited = neighbours(grid, x, y);
      while (unvisited.length > 0){
        var to_visit = unvisited.pop();
        if (grid.coloured_cells[to_visit] === colour) {
          to_colour.push(to_visit);
          var nbours = neighbours(grid, to_visit[0], to_visit[1]);
          for (var index in nbours){
            // add cell to unvisited if we haven't visited it before and not in unvisited already
            if (!contains(visited, nbours[index]) && !contains(unvisited, nbours[index])) unvisited.push(nbours[index]);
          }
        }
        visited.push(to_visit); // has been visited
      }

      // now colour all the elements
      for (var index in to_colour){
        grid.colourCell(to_colour[index][0], to_colour[index][1], current_colour);
      }

      grid.drawGridlines();
    }
  }

  return changed;
}

function toggleMode(input) {
  mode = input;
  console.log('Mode: ' + mode);
}


function drawContextBox(){
  // now plot the box on the full grid
  fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
  fullGrid.drawGridlines();
  fullGrid.colourGrid();

  fullGrid.ctx.save();
  fullGrid.ctx.beginPath();
  fullGrid.ctx.setLineDash([]);
  fullGrid.ctx.lineWidth = fullGrid.cell_size/10;
  fullGrid.ctx.strokeStyle = 'rgb(0,0,0)';
  fullGrid.ctx.rect(top_left[0], top_left[1], workingGrid.num_cells*fullGrid.cell_size, workingGrid.num_cells*fullGrid.cell_size);
  fullGrid.ctx.closePath();
  fullGrid.ctx.stroke();
  fullGrid.ctx.restore();
}

// move our working grid to a different part of the full grid
function moveWorking(move_to) {
  // need to make sure we won't go off the edge of the grid
  top_left = [fullGrid.min_x + fullGrid.cell_size*Math.floor((move_to[0] - fullGrid.min_x)/fullGrid.cell_size), fullGrid.min_y + fullGrid.cell_size*Math.floor((move_to[1] - fullGrid.min_y)/fullGrid.cell_size)];
  if (top_left[0] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_x) top_left[0] = fullGrid.max_x - workingGrid.num_cells*fullGrid.cell_size;
  if (top_left[1] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_y) top_left[1] = fullGrid.max_y - workingGrid.num_cells*fullGrid.cell_size;

  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
  workingGrid.coloured_cells = [];
  // can either iterate through fullGrid.coloured_cells or through all the cells in workingGrid
  for (x=0; x<=workingGrid.num_cells; x++){
    for (y=0; y<=workingGrid.num_cells; y++){
      var fullX = top_left[0] + x*fullGrid.cell_size;
      var fullY = top_left[1] + y*fullGrid.cell_size;
      var workingX = workingGrid.min_x + x*workingGrid.cell_size;
      var workingY = workingGrid.min_y + y*workingGrid.cell_size;

      if ([fullX, fullY] in fullGrid.coloured_cells) workingGrid.colourCell(workingX, workingY, fullGrid.coloured_cells[[fullX, fullY]], false);
    }
  }
  workingGrid.drawGridlines();

  drawContextBox();
}

function drawOverall(working_x, working_y) {
  // transfer the coloured_cells vector to the full grid
  var coords = [working_x, working_y];
  var colour = workingGrid.coloured_cells[coords];

  // scale the coords for the full grid
  coords[0] -= workingGrid.min_x;
  coords[0] *= fullGrid.cell_size/workingGrid.cell_size;
  coords[0] += top_left[0];

  coords[1] -= workingGrid.min_y;
  coords[1] *= fullGrid.cell_size/workingGrid.cell_size;
  coords[1] += top_left[1];

  fullGrid.colourCell(coords[0], coords[1], colour, false);
}

function eraseOverall(working_x, working_y) {
  // transfer the coloured_cells vector to the full grid
  var coords = [working_x, working_y];

  // scale the coords for the full grid
  coords[0] -= workingGrid.min_x;
  coords[0] *= fullGrid.cell_size/workingGrid.cell_size;
  coords[0] += top_left[0];

  coords[1] -= workingGrid.min_y;
  coords[1] *= fullGrid.cell_size/workingGrid.cell_size;
  coords[1] += top_left[1];

  fullGrid.eraseCell(coords[0], coords[1], false);
  drawContextBox();
}

function savePicture() {
  // first need to convert keys to strings in the coloured_cells array
  var save_array = {};
  for (var coords in fullGrid.coloured_cells){
    save_array[coords.toString()] = fullGrid.coloured_cells[coords];
  }

  localStorage.removeItem('picture');
  localStorage['picture'] = JSON.stringify(save_array);
}

function loadPicture() {
  fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
  fullGrid.coloured_cells = []; // reset

  var coloured_cells = JSON.parse(localStorage['picture']);

  for (var coords_string in coloured_cells){
    var coords = coords_string.split(',')
    coords = [parseInt(coords[0], 10), parseInt(coords[1], 10)];

    fullGrid.ctx.beginPath();
    fullGrid.ctx.fillStyle = coloured_cells[coords_string];
    fullGrid.ctx.fillRect(coords[0], coords[1], fullGrid.cell_size, fullGrid.cell_size);
    fullGrid.ctx.closePath();

    // now need to add point to myGrid's array
    fullGrid.coloured_cells[coords] = coloured_cells[coords_string];
  }

  fullGrid.drawGridlines();

  moveWorking([fullGrid.min_x, fullGrid.min_y]);
}

function clearPicture() {
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);

  workingGrid.coloured_cells = [];
  workingGrid.drawGridlines();

  // only clear the workngGrid portion of fullGrid
  fullGrid.ctx.clearRect(top_left[0]-fullGrid.cell_size, top_left[1]-fullGrid.cell_size, 1+(workingGrid.num_cells+1)*fullGrid.cell_size, 1+(workingGrid.num_cells+1)*fullGrid.cell_size);
  fullGrid.drawGridlines(workingGrid.num_cells, top_left[0], top_left[1]);

  // now update fullGrid's coloured_cells array
  for (x=0; x<workingGrid.num_cells; x++){
    for (y=0; y<workingGrid.num_cells; y++){
      delete fullGrid.coloured_cells[[top_left[0] + x*fullGrid.cell_size, top_left[1] + y*fullGrid.cell_size]];
    }
  }

  drawContextBox();
}

function undo(){
  // pop the last saved version of grid off the stack and draw it
  if (previous_grids.length > 0){
    fullGrid.coloured_cells = previous_grids.pop();

    fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
    fullGrid.colourGrid();
    fullGrid.drawGridlines();

    moveWorking(top_left);
    workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
    workingGrid.colourGrid();
    workingGrid.drawGridlines();
  }
}


function zoomIn() {
  if (workingGrid.num_cells >= 2) {
    workingGrid.num_cells = Math.floor(workingGrid.num_cells/zoomRatio);
    workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;
  }

  workingGrid.reset();
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
  updateScrollBarDimensions();
}

function zoomOut() {
  if (workingGrid.num_cells*zoomRatio <= fullGrid.num_cells) {
    workingGrid.num_cells = Math.ceil(zoomRatio*workingGrid.num_cells);
    workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;
  } else {
    workingGrid.num_cells = fullGrid.num_cells;
    workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;
  }

  // amend the top left of the context box if needed
  if (top_left[0] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_x) top_left[0] = fullGrid.max_x - workingGrid.num_cells*fullGrid.cell_size;
  if (top_left[1] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_y) top_left[1] = fullGrid.max_y - workingGrid.num_cells*fullGrid.cell_size;

  workingGrid.reset();
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
  updateScrollBarDimensions();
}


function colourWorkingGrid() {
  // can either iterate through fullGrid.coloured_cells or through all the cells in workingGrid
  for (x=0; x<=workingGrid.num_cells; x++){
    for (y=0; y<=workingGrid.num_cells; y++){
      var fullX = top_left[0] + x*fullGrid.cell_size;
      var fullY = top_left[1] + y*fullGrid.cell_size;
      var workingX = workingGrid.min_x + x*workingGrid.cell_size;
      var workingY = workingGrid.min_y + y*workingGrid.cell_size;

      if ([fullX, fullY] in fullGrid.coloured_cells) workingGrid.colourCell(workingX, workingY, fullGrid.coloured_cells[[fullX, fullY]], false);
    }
  }
}


function drawScrollBars() {
  var vscrollbar = document.getElementById("vbar");
  vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';


  $(".vert-bar").draggable({
              containment: "parent",
              axis: "y"
          });

  $(".vert-bar").on("drag", function (event, ui) {
      var top_left_y = fullGrid.min_y + (ui.position.top/($(".vertical-scroll").height()-$(".vert-bar").height()))*fullGrid.num_cells*fullGrid.cell_size*(1 - workingGrid.num_cells/fullGrid.num_cells);
      moveWorking([top_left[0], top_left_y]);
  });


  var hscrollbar = document.getElementById("hbar");
  hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';

  $(".horiz-bar").draggable({
              containment: "parent",
              axis: "x"
          });

  $(".horiz-bar").on("drag", function (event, ui) {
      var top_left_x = fullGrid.min_x + (ui.position.left/($(".horiz-scroll").width()-$(".horiz-bar").width()))*fullGrid.num_cells*fullGrid.cell_size*(1 - workingGrid.num_cells/fullGrid.num_cells);
      moveWorking([top_left_x, top_left[1]]);
  });
}

function moveScrollBars() {
  var top = ($(".vertical-scroll").height() - $(".vert-bar").height())*(top_left[1] - fullGrid.min_y)/(fullGrid.max_y - workingGrid.num_cells*fullGrid.cell_size - fullGrid.min_y);
  var left = ($(".horiz-scroll").width() - $(".horiz-bar").width())*(top_left[0] - fullGrid.min_x)/(fullGrid.max_x - workingGrid.num_cells*fullGrid.cell_size - fullGrid.min_x);

  $(".vert-bar").css('top', top + 'px');
  $(".horiz-bar").css('left', left + 'px');
}

function updateScrollBarDimensions() {
  var vscrollbar = document.getElementById("vbar");
  var hscrollbar = document.getElementById("hbar");
  vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';
  hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';

  if ($(".vert-bar").position().top + $(".vert-bar").height() > $(".vertical-scroll").height()) $(".vert-bar").css('top', $(".vertical-scroll").height() - $(".vert-bar").height() + 'px');
  if ($(".horiz-bar").position().left + $(".horiz-bar").width() > $(".horiz-scroll").width()) $(".horiz-bar").css('left', $(".horiz-scroll").width() - $(".horiz-bar").width() + 'px');
}

$("#colourPicker").on('change', function() {
  current_colour = $("#colourPicker").spectrum('get').toHexString();
});

// main code
var top_left = [], previous_grids = [];
var h_scrolling = false, v_scrolling = false;
var zoomRatio = 1.5;

var overallDiv = document.getElementById("d3");
var overallCanvas = document.getElementById("overallCanvas");
var fullGrid = new Grid(4, 80, overallCanvas, overallDiv);

var canvasDiv = document.getElementById("d1");
var canvas = document.getElementById("gridCanvas");
var workingGrid = new Grid(28, 20, canvas, canvasDiv);

var current_colour = $("#colourPicker").spectrum('get').toHexString();

addClickHandler(workingGrid);
drawScrollBars();
moveWorking([fullGrid.min_x, fullGrid.min_y]);
toggleMode("pen"); // others are 'fill' and 'box'
