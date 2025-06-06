# Creating local fake data for additional years
In order to explore the timeline beyond just 2024, you can generate further fake data with the Python backend script.

# Steps
## Set up the Python env as described in the overall README
Install pandas and numpy:
`pip install numpy && pip install pandas`

## Run `python3 make_timelineable_stub_data.py` with the file `era5_data_2024_01_02_monthly_area_celsius_january_05res.csv` in the same directory (/sampleData)
This will create 20 year-named files which you can use to move along the timeline

## Copy all the created files from /sampleData to /frontend/public without adding them to git.
Make sure the resulting files have a size of >0 bytes. Sometimes I found my IDE would cache empty files.
