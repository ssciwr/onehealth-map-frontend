import type React from "react";
import { createContext, useContext } from "react";
import {
	type UserSelectionsStore,
	userSelectionsStore,
} from "../stores/UserSelectionsStore";

const UserSelectionsContext =
	createContext<UserSelectionsStore>(userSelectionsStore);

export const UserSelectionsProvider: React.FC<{
	children: React.ReactNode;
}> = ({ children }) => {
	return (
		<UserSelectionsContext.Provider value={userSelectionsStore}>
			{children}
		</UserSelectionsContext.Provider>
	);
};

export const useUserSelectionsStore = () => {
	const context = useContext(UserSelectionsContext);
	if (!context) {
		throw new Error(
			"useUserSelectionsStore must be used within a UserSelectionsProvider",
		);
	}
	return context;
};
