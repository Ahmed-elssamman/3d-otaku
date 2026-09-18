// http://www.openscad.org/cheatsheet/index.html
//   Characters    Behavior
//      //            comment rest of line
//      *             disable
//      !             show only
//      #             highlight / debug
//      %             enable alpha channel, eg color("#RRGGBBAA")           https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#color
//      $t            time step, range: [0..1]
//      $vpr          viewport rotation, eg: $vpr = [0, 0, $t * 360];
//      import()      import a 2D or 3D file
//      surface()     treat 2D file with RGB/grayscale as heightmap
//      include <>    the modules and functions and execute commands
//      use <>        only the modules and functions

include <BOSL/constants.scad>    // https://github.com/revarbat/BOSL/wiki/constants.scad
use <BOSL/shapes.scad>           // https://github.com/revarbat/BOSL/wiki/shapes.scad
use <BOSL/transforms.scad>       // https://github.com/revarbat/BOSL/wiki/transforms.scad

// Globals

convexity = 4;
number_of_fragments = 0.1 * 360;
eps = 0.001;
mm_per_inch = 25.4;

$fn = number_of_fragments;

// Functions
function inches_as_mm(inches) = inches * mm_per_inch;
function framesizes(base_size, top_size, height, thickness, layer_multiplier) =
    let (
        layer_count = layer_multiplier * height / thickness,
        base_x = base_size[0],
        base_y = base_size[1],
        top_x = top_size[0],
        top_y = top_size[1],
        x_growth = (top_x - base_x) / layer_count,
        y_growth = (top_y - base_y) / layer_count,
        two_pi = 6.28
    )
    [
        for (layer = [0:layer_count])
        let (
            linear_x = base_x + (layer * x_growth),
            linear_y = base_y + (layer * y_growth),
            x_mod = 5 * sin(400 * two_pi * layer / layer_count),
            y_mod = 5 * sin(100 * two_pi * layer / layer_count)
        )
        [linear_x + x_mod, linear_y + y_mod]
    ];

// Modules
module frame(x=250, y=400, thickness=20)
    let (
        frame_radius = thickness / 2
    )
    {
        echo(str("frame(x=", x, ", y=", y, ", thickness=", thickness, ")"));

        yspread(y)
        hull()
        xspread(x)
        sphere(r=frame_radius, $fn=8);

        color("blue")
        xspread(x)
        hull()
        yspread(y)
        sphere(r=frame_radius, $fn=8);
    }

module stack_by_layer(base_size, top_size, height, thickness, base_thickness)
    let (
        layer_multiplier = 2,
        frame_params = framesizes(base_size, top_size, height, thickness, layer_multiplier)
    )
    {
        for (layer = [0 : len(frame_params) - 1])
        let(
            x = frame_params[layer][0],
            y = frame_params[layer][1],
            z = layer * thickness / layer_multiplier
        )
        {
            zmove(z)
            if (z <= base_thickness - 0.5 * thickness)
            {
                color("purple")
                hull() frame(x=x, y=y, thickness=thickness);
            }
            else
            {
                frame(x=x, y=y, thickness=thickness);
            }
        }
    }

// Objects
fine = 2;
rough = 8;

stack_by_layer(
    base_size=[inches_as_mm(4),inches_as_mm(6)],
    top_size=[inches_as_mm(5),inches_as_mm(8)],
    height=inches_as_mm(10),
    thickness=fine,
    base_thickness=5);
