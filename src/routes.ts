import HealthController from "./controller/HealthController";
import LogController from "./controller/LogController";
import WaxController from "./controller/WaxController";

export const Routes = [
    {
        method: "get",
        route: "/health",
        controller: HealthController,
        action: "version"
    },
    {
        method: "get",
        route: "/logs",
        controller: LogController,
        action: "logs"
    },
    {
        method: "post",
        route: "/api/v1/activateAccount",
        controller: WaxController,
        action: "activateAccount"
    },
];