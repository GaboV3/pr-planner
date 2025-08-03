# Distance and Altitude Calculator for Project Reality Maps

## About the Project

This is a web tool llows loading game maps to accurately calculate the distance, altitude difference, and azimuth between a fixed point.

## Features

- **Map Selection**: Dynamically loads a list of available maps from a configuration file.
- **Real-time Calculations**: Instantly displays the results for:
  - **Distance** in meters.
  - **Altitude Difference** in meters.
  - **Azimuth** in degrees.

## Getting Started

The application is designed to run directly in the browser, without the need for a web server or a build process.
https://gabov3.github.io/pr-planner

### Adding New Maps

To add a new map to the calculator, follow these steps:

1.  Create a new folder inside the `/maps/` directory. The folder name must be unique (e.g., `albasrah`).
2.  Inside this new folder, add the two required files:
    - `ingamemap.webp`: The map image that will be displayed.
    - `output.tif`: The TIF file containing the map's altitude data.
3.  Open the `maps/maps_data.json` file and add a new object to the array with your map's information:
    ```json
    {
      "folder_name": "albasrah", 
      "real_name": "Al Basrah",    
      "size": "2km"              
    }
    ```
