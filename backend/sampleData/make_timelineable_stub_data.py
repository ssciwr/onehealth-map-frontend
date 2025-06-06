import pandas as pd
import numpy as np
import os

high_res = False # just do 0.5 for now.

def calculate_temperature_increase(latitude, max_increase=10, gradient_strength=1.0):
    """
    Calculate temperature increase based on latitude.
    Lower absolute latitudes get higher increases.

    Args:
        latitude: The latitude value (-90 to 90)
        max_increase: Maximum temperature increase at poles
        gradient_strength: Multiplier for the gradient (0.5 to 1.5)

    Returns:
        Temperature increase value
    """
    # Normalize latitude to 0-1 scale (0 at equator, 1 at poles)
    normalized_lat = abs(latitude) / 90.0

    # Apply a power function to create non-linear gradient
    # Power of 2 makes the increase more pronounced at higher latitudes
    increase = max_increase * (normalized_lat ** 2) * gradient_strength

    # Flip to make a decrease generally at higher extreme latitudes
    return -increase

def process_climate_data(input_file, output_dir=None):
    """
    Process climate data file and generate 20 years of adjusted data.

    Args:
        input_file: Path to the input CSV file
        output_dir: Directory to save output files (defaults to same as input)
    """
    # Read the input data
    print(f"Reading data from {input_file}...")
    df = pd.read_csv(input_file)

    # Set output directory
    if output_dir is None:
        output_dir = os.path.dirname(input_file)
        # If dirname returns empty string, use current directory
        if not output_dir:
            output_dir = "."

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Process years 2025-2045
    for year in range(2025, 2046):
        print(f"Processing year {year}...")

        # Create a copy of the dataframe
        df_year = df.copy()

        # Calculate gradient strength for this year
        # Base gradient strength varies between 0.7 and 1.3
        # with some random variation
        years_since_2025 = year - 2025
        base_gradient = 0.7 + (years_since_2025 / 20) * 3  # Linear increase
        random_variation = np.random.uniform(-0.1, 0.1)  # Random variation
        gradient_strength = np.clip(base_gradient + random_variation, 0.5, 8)

        # Apply temperature adjustments
        temperature_increases = []
        for idx, row in df_year.iterrows():
            latitude = row['latitude']
            temp_increase = calculate_temperature_increase(
                latitude,
                max_increase=40,
                gradient_strength=gradient_strength
            )
            # Add small random noise to each point (±0.5°C)
            noise = np.random.uniform(-0.5, 0.5)
            temp_increase += noise

            temperature_increases.append(temp_increase)

        # Apply the temperature increases
        df_year['t2m'] = df_year['t2m'] + temperature_increases

        # Update the valid_time to the new year
        df_year['valid_time'] = df_year['valid_time'].str.replace('2024', str(year))

        # Save the file
        output_filename = f"{year}_data_january.csv" if high_res else f"{year}_data_january_05res.csv"
        output_path = os.path.join(output_dir, output_filename)
        df_year.to_csv(output_path, index=False)

        # Print statistics for this year
        avg_increase = np.mean(temperature_increases)
        max_increase = np.max(temperature_increases)
        print(f"  Year {year}: Gradient strength = {gradient_strength:.3f}, "
              f"Avg increase = {avg_increase:.2f}°C, Max increase = {max_increase:.2f}°C")

    print("\nProcessing complete! Generated 20 files for years 2025-2045.")

def main():
    """
    Main function to run the climate data processor.
    """
    # Configuration
    input_file = "era5_data_2024_01_02_monthly_area_celsius_january.csv" if high_res else \
    "era5_data_2024_01_02_monthly_area_celsius_january_05res.csv"
    output_dir = None  # Will save in same directory as input file

    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        print("Please make sure the file exists and update the path in the script.")
        return

    # Process the data
    process_climate_data(input_file, output_dir)

if __name__ == "__main__":
    main()
