var canvas = document.getElementById("displayCanvas");
var ctx = canvas.getContext("2d");

function displayPicture() {
  var coloured_cells = JSON.parse(localStorage['picture']);

  for (var coords_string in coloured_cells){
    var coords = coords_string.split(',')
    var scale_factor = 7/4;
    coords = [scale_factor*parseInt(coords[0], 10), scale_factor*parseInt(coords[1], 10)];

    ctx.beginPath();
    ctx.fillStyle = coloured_cells[coords_string];
    ctx.fillRect(coords[0], coords[1], 7, 7); // this is the cell size from myGrid
    ctx.closePath();
  }
}
