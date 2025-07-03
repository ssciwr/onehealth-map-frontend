# Frontend

The frontend uses React.js and Leaflet to render a map.

There are two main parts:
1) The data-fetching, Model list and rendering that data on the Map
2) The inputs that change state which updates the Map (timeline date selector, etc)


## Design
The map design is different on mobile and desktop. To support mobile, a Control Bar UI, a more formal inspiration of
TikToks right bar is used. Color balances are really important in this application, because of the map colors.
It also matters because the gradient has to be quite specific to work. Just two colors makes it hard to see the small
differences on the map when you zoom in. Three, such as Red-Yellow-Blue, works much better, and a rainbow also works.
Though a Rainbow might get too complicated because not everybody knows the order intuitively and it has other symbolism.

## Design rules
The design of this map attempts to stick to the guidelines set out here which align with my experience making a video
game with a map interface: https://proceedings.esri.com/library/userconf/devsummit17/papers/dev_int_137.pdf

The main parts being not overwhelming the user, not filling the page with logos or text, and keeping good balance
design wise.
