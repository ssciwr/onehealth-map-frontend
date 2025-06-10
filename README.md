# Overview
A project to render a map of NUTs regions with varied intensities, and later, with outbreaks.

# How to run
- Put "nutsRegions.csv" in the `frontend/data` folder.
- cd to /frontend
- Run `pnpm i`
- Run `pnpm run dev`

# How to use
The website can be used by visiting `http://localhost:5173/map`, which will present the user with two view modes.

You can also share the link directly to a specific view mode:
- Citizen: `http://localhost:5173/map/citizen`
- Expert:  `http://localhost:5173/map/expert`

# Preview
![image](https://github.com/user-attachments/assets/b7273a78-15a7-4304-88ea-d4b537f7c03e)

# Data for the UI

## Future
In the future, the UI will make API requests to get the Data.

## Presently - Static File / Python
Python is only used in a tiny way and not necessary for set up. It is used to create fake data for playing with the UI.

If you would like to create that fake data, I would advise setting up a virtual environment for it.

Create a VENV with Python 3.12, activate it.
```bash
python3.12 -m venv ~/.venvs/oh
source ~/.venvs/oh/bin/activate
```
