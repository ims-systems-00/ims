import { Badge, Button, Col, Row } from "@ims-systems-00/ims-ui-kit";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Box } from "../../components/Box";
import If from "../../components/If";
import { useApplication } from "../../store/applicationStore";
import Signature from "./components/Signature";
import { useProfile } from "./useProfile";
import { useSignature } from "./useSignature";
const viewModes = {
  edit: "edit",
  view: "view",
  readonly: "readonly",
};
function Profile() {
  const { currentUserData } = useApplication();
  const { id } = useParams();
  const { profile, loading } = useProfile(id);
  const { changeSignature, signature, signatureUrl, uploadingSignature } =
    useSignature(id);
  const [viewMode, setViewMode] = useState(viewModes.readonly);
  if (loading) return <p className="text-center my-5">Loading Profile...</p>;
  console.log("signature url", signatureUrl);
  return (
    <div className="content py-3">
      <Row>
        <Col className="mx-auto" md="6">
          <Box>
            <div className="d-flex justify-content-between">
              <h5>Profile</h5>

              <If expression={id === currentUserData?._id}>
                <div className="d-flex gap-2">
                  <If expression={viewMode === viewModes.view}>
                    <Button
                      className="ms-auto border-0"
                      outline
                      size="sm"
                      onClick={() => setViewMode(viewModes.edit)}
                    >
                      Edit
                    </Button>
                  </If>
                  <If expression={viewMode === viewModes.edit}>
                    <Button
                      className="ms-auto border-0"
                      outline
                      size="sm"
                      color="primary"
                      onClick={() => setViewMode(viewModes.view)}
                    >
                      Save
                    </Button>
                    <Button
                      className="ms-auto border-0"
                      outline
                      size="sm"
                      color="danger"
                      onClick={() => setViewMode(viewModes.view)}
                    >
                      Cancel
                    </Button>
                  </If>
                </div>
              </If>
            </div>
            <div className="d-flex justify-content-center align-items-center gap-2">
              <img
                src={profile?.user?.profileImageSrc}
                alt="profile"
                className="rounded-circle border border-2 border-primary"
                width={150}
                height={150}
              />
            </div>
            <div className="text-center my-3">
              <h6>{profile?.user?.name}</h6>
              <p>{profile?.user?.email}</p>
            </div>
          </Box>
          <Box>
            <h5>Basic Information</h5>
            <Row>
              <Col md="6">
                <h6 className="my-2">First Name</h6>
                <p>{profile?.user?.firstName} </p>
              </Col>
              <Col md="6">
                <h6 className="my-2">Last Name</h6>
                <p>{profile?.user?.lastName}</p>
              </Col>
            </Row>
          </Box>

          <Box>
            <h5>Employment Information</h5>
            <Row>
              <Col md="6">
                <h6 className="my-2">Role</h6>
                <p>{profile?.user?.membership?.role || "N/A"}</p>
              </Col>
              <Col md="6">
                <h6 className="my-2">Job Type</h6>
                <p>{profile?.user?.membership?.workLocationType || "N/A"}</p>
              </Col>
              <Col md="6">
                <h6 className="my-2">Job Title</h6>
                <p>{profile?.user?.membership?.jobTitle || "N/A"}</p>
              </Col>
              <Col md="6">
                <h6 className="my-2">Leaves Entitled To</h6>
                <p>{profile?.user?.membership?.leaveDaysEntitledTo}</p>
              </Col>
              <Col md="6">
                <h6 className="my-2">Country</h6>
                <p>{profile?.user?.country?.name || "N/A"}</p>
              </Col>
              <Col md="6">
                <h6 className="my-2">Line Manager</h6>
                {profile?.user?.membership?.lineManagers?.length > 0 ? (
                  profile?.user?.membership?.lineManagers?.map(
                    (lineManager, index) => (
                      <Link to={`/profile/${lineManager?._id}`} key={index}>
                        <Badge variant="default">{lineManager?.name}</Badge>
                      </Link>
                    )
                  )
                ) : (
                  <p>Not set</p>
                )}
              </Col>
            </Row>
          </Box>

          <Box>
            <h5>Digital Signature</h5>

            <div className="my-3 w-100">
              <Signature
                onChange={(file) => changeSignature(file.file)}
                hint={signature ? "Change signature" : "Add signature"}
                url={signatureUrl}
                disabled={uploadingSignature.status}
                uploadProgress={uploadingSignature.progress}
              />
            </div>
          </Box>
        </Col>
      </Row>
    </div>
  );
}

export default Profile;
