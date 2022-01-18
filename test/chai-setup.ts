import { smock } from "@defi-wonderland/smock";
import chaiModule from "chai";
import chaiAsPromised from "chai-as-promised";

chaiModule.use(chaiAsPromised);
chaiModule.use(smock.matchers);

export = chaiModule;
