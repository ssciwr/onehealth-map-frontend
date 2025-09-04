# Overview
This Climate map renders data from the frontend. It can be configured to request and display NUTS3 regions, or worldwide equivalent regions.
For the worldwide view, the data is projected from individual points into polygons on the frontend.
There was a grid view which has been removed from the UI, but still exists in the code presently. Once we confirm we do not want that interface type,
we will remove that.

# How to run
- First, make sure the `onehealth-db` repository is running with the API accessible. It needs to have generated data for 2016 and 2017.
- Run `pnpm i`
- Run `pnpm run dev`

# How to use
The website can be used by visiting `http://localhost:5173/map`, which will present the user with two view modes.

You can also share the link directly to a specific view mode:
- Citizen: `http://localhost:5173/map/citizen`
- Expert:  `http://localhost:5173/map/expert`

# Preview
![image](https://github.com/user-attachments/assets/b7273a78-15a7-4304-88ea-d4b537f7c03e)
