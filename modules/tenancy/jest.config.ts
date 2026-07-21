import type { Config } from "jest";

const config: Config = {
	verbose: true,
	preset: "ts-jest",
	testMatch: ["**/test/**/*.(test|spec).ts"],
};

export default config;
