import { PiCarSimple } from "react-icons/pi";
import { FaRegBuilding } from "react-icons/fa6";
import { GrPowerCycle } from "react-icons/gr";
import { PiLinkBreakBold } from "react-icons/pi";
import { MdElectricBolt } from "react-icons/md";
import { GiHeatHaze } from "react-icons/gi";
import { LiaBoxesSolid } from "react-icons/lia";
import { AiFillProduct } from "react-icons/ai";
import { RiShipLine } from "react-icons/ri";
import { PiHandCoinsLight } from "react-icons/pi";
import { AiOutlineShop } from "react-icons/ai";
import { GiChart } from "react-icons/gi";
import { LuFuel } from "react-icons/lu";
import { IoAirplaneOutline } from "react-icons/io5";
import { MdOutlineTrain } from "react-icons/md";
import { MdOutlineMapsHomeWork } from "react-icons/md";
import { CgTrash } from "react-icons/cg";
import { TbBoxOff } from "react-icons/tb";
import { TbBasketCog } from "react-icons/tb";
import { FaHands } from "react-icons/fa";
import CC_CONSTANTS from "../constants";
const icons = {
  [CC_CONSTANTS.CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_PREMISES]: (
    <FaRegBuilding />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_VEHICLES]: (
    <PiCarSimple />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_1_CATEGORY_NAMES.PROCESS_EMISSIONS]: (
    <GrPowerCycle />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_1_CATEGORY_NAMES.FUGITIVE_EMISSIONS]: (
    <PiLinkBreakBold />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_ELECTRICITY]: (
    <MdElectricBolt />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM]: (
    <GiHeatHaze />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES
    .PURCHASED_GOODS_AND_SERVICES]: <LiaBoxesSolid />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.CAPITAL_GOODS]: (
    <AiFillProduct />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES
    .UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION]: <RiShipLine />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES
    .WASTE_GENERATED_IN_OPERATIONS]: <CgTrash />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.BUSINESS_TRAVEL]: (
    <IoAirplaneOutline />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING]: (
    <MdOutlineTrain />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES
    .EMPLOYEE_COMMUTING_HOMEWORKING]: <MdOutlineMapsHomeWork />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_LEASED_ASSETS]: (
    <PiHandCoinsLight />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES
    .DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION]: <RiShipLine />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PROCESSING_OF_SOLD_PRODUCTS]:
    <TbBasketCog />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.USE_OF_SOLD_PRODUCTS]: (
    <FaHands />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES
    .END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS]: <TbBoxOff />,
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_LEASED_ASSETS]: (
    <PiHandCoinsLight />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.FRANCHISES]: (
    <AiOutlineShop />
  ),
  [CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES.INVESTMENTS]: <GiChart />,
};
export default function CategoryIcon({ category = "" }) {
  return icons[category];
}
