import type {
  AnyAsset,
  AssetCategory,
  HardwareAsset,
  InformationAsset,
  PeopleAsset,
  PremiseAsset,
  SoftwareAsset,
} from "../types";

function Item({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
  return (
    <div>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value">
        {value === undefined || value === null || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

export function AssetDetails({
  category,
  asset,
}: {
  category: AssetCategory;
  asset: AnyAsset;
}) {
  return (
    <dl className="ims-detail-grid">
      <Item label="Reference" value={asset.reference} />
      <Item label="Business unit" value={asset.businessUnitId} />
      <Item label="Cost" value={asset.cost} />
      <Item
        label="Created"
        value={new Date(asset.createdAt).toLocaleString()}
      />

      {category === "hardware" ? (
        <HardwareDetails asset={asset as HardwareAsset} />
      ) : null}
      {category === "software" ? (
        <SoftwareDetails asset={asset as SoftwareAsset} />
      ) : null}
      {category === "people" ? (
        <PeopleDetails asset={asset as PeopleAsset} />
      ) : null}
      {category === "premise" ? (
        <PremiseDetails asset={asset as PremiseAsset} />
      ) : null}
      {category === "information" ? (
        <InformationDetails asset={asset as InformationAsset} />
      ) : null}
    </dl>
  );
}

function HardwareDetails({ asset }: { asset: HardwareAsset }) {
  return (
    <>
      <Item label="Name" value={asset.name} />
      <Item label="Tag" value={asset.tag} />
      <Item label="Owner" value={asset.ownerId} />
      <Item
        label="Assigned"
        value={
          asset.assignedDate
            ? new Date(asset.assignedDate).toLocaleDateString()
            : undefined
        }
      />
      <Item
        label="Returned"
        value={
          asset.returnDate
            ? new Date(asset.returnDate).toLocaleDateString()
            : undefined
        }
      />
      <Item
        label="Destroyed"
        value={
          asset.destructionDate
            ? new Date(asset.destructionDate).toLocaleDateString()
            : undefined
        }
      />
    </>
  );
}

function SoftwareDetails({ asset }: { asset: SoftwareAsset }) {
  return (
    <>
      <Item label="Name" value={asset.name} />
      <Item label="Licences" value={asset.licenceCount} />
      <Item label="Installs" value={asset.installCount} />
      <Item label="Keys" value={asset.keys.length} />
      <Item label="Documents" value={asset.documents.length} />
    </>
  );
}

function PeopleDetails({ asset }: { asset: PeopleAsset }) {
  return (
    <>
      <Item label="Name" value={asset.name} />
      <Item label="Role" value={asset.role} />
      <Item label="Skill" value={asset.skill} />
      <div className="sm:col-span-2">
        <Item label="Responsibility" value={asset.responsibility} />
      </div>
    </>
  );
}

function PremiseDetails({ asset }: { asset: PremiseAsset }) {
  return (
    <>
      <Item label="Building name" value={asset.name} />
      <Item label="Location" value={asset.location} />
      <div className="sm:col-span-2">
        <Item label="Address" value={asset.address} />
      </div>
    </>
  );
}

function InformationDetails({ asset }: { asset: InformationAsset }) {
  return (
    <>
      <Item label="Title" value={asset.title} />
      <Item label="Inventory" value={asset.informationInventory} />
      <Item label="Format" value={asset.format} />
      <Item label="Storage" value={asset.storageLocation} />
      <Item label="Owner" value={asset.ownerId} />
      <Item label="Link" value={asset.link} />
    </>
  );
}
