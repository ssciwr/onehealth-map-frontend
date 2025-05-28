# Overview
A project to render a map of NUTs regions with varied intensities, and later, with outbreaks.

# How to run
- Put "nutsRegion.csv" in the `frontend/data` folder.
- cd to /frontend
- Run `pnpm i`
- Run `pnpm run dev`

# How to use
The website can be used by visiting `http://localhost:5174/map`, which will present the user with two view modes.

You can also share the link directly to a specific view mode:
- Citizen: `http://localhost:5174/map/citizen`
- Expert:  `http://localhost:5174/map/expert`

# Preview
![image](https://github.com/user-attachments/assets/b7273a78-15a7-4304-88ea-d4b537f7c03e)


# Set up

## Python
Create a VENV with Python 12, activate it.
```bash
python3.12 -m venv ~/.venvs/oh
source ~/.venvs/oh/bin/activate
```