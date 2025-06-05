import { Activity, Bug, Droplets, Shield } from "lucide-react";

// todo: WIll be more like "Data type" "Data source" or "Models" but just for display...

export const VIRUSES = [
	{
		id: "west-nile",
		title: "West Nile Virus",
		description: "Mosquito-borne disease affecting humans and animals",
		emoji: "🦟",
		icon: Bug,
		color: "#754910",
	},
	{
		id: "dengue",
		title: "Dengue",
		description: "Viral infection transmitted by Aedes mosquitoes",
		emoji: "🦠",
		icon: Bug,
		color: "#c592bf",
	},
	{
		id: "malaria",
		title: "Malaria",
		description: "Parasitic disease spread through infected mosquitoes",
		emoji: "🩸",
		icon: Droplets,
		color: "#9c27b0",
	},
	{
		id: "covid-19",
		title: "COVID-19",
		description: "Respiratory illness caused by SARS-CoV-2",
		emoji: "😷",
		icon: Shield,
		color: "#95fbd1",
	},
	{
		id: "zika",
		title: "Zika Virus",
		description: "Mosquito-transmitted disease with mild symptoms",
		emoji: "🌡️",
		icon: Activity,
		color: "#99ff00",
	},
];
// todo: Read the above from YAML. After monday, figure out how to display multiple models per data type.
// E.g. Model A for Zika, Model B for Zika. Model A for rainfall, Model F for Climate.
