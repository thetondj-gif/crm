import { Module } from "@nestjs/common";
import { DawnBridgeAuth } from "./dawn-bridge.auth";
import { DawnBridgeController } from "./dawn-bridge.controller";

@Module({
	controllers: [DawnBridgeController],
	providers: [DawnBridgeAuth],
})
export class DawnBridgeModule {}
