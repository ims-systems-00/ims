import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Form,
  Input,
  InputGroup,
  InputGroupText,
  Spinner,
} from "@ims-systems-00/ims-ui-kit";
import { RiSearch2Line } from "react-icons/ri";
import useDebounce from "../../hooks/useDebounce";
import * as ccDefraFactorService from "../../services/ccDefraFactorService";
import { HiOutlineLightBulb } from "react-icons/hi";
import CC_CONSTANTS from "../../constants";
import { useActivitiesDropdown } from "../../hooks/useActivitiesDropdown";
import { MdOutlineClose } from "react-icons/md";
import { Link } from "react-router-dom";
function CategoryNavigateButton({ category = "", onClick = function () {} }) {
  return (
    <Link to={"/categories?category=" + category}>
      <Button className="rounded-pill" size="sm" onClick={onClick}>
        {category}
      </Button>
    </Link>
  );
}
export function SearchFactors({
  onSearch = function () {},
  onNavigate = function () {},
  children,
  ...inputProps
}) {
  let { debouncedValue, setDebounced } = useDebounce(500);
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  useEffect(
    function () {
      async function search(searchKeywords = "") {
        setLoadingResults(true);
        try {
          const response = await ccDefraFactorService.listDefraFactors({
            query: "clientSearch=" + searchKeywords,
          });
          setResults(response.data?.ccDefraFactors);
        } catch (err) {
          console.log(err);
        }
        setLoadingResults(false);
      }
      search(debouncedValue);
      onSearch(debouncedValue);
    },
    [debouncedValue]
  );
  const { getCalculationMethodDropdown, getCombinedActivityReferenceDropdown } =
    useActivitiesDropdown();

  function getMatchingCategories(categories = [], activityToMatch) {
    return categories
      .filter((category) => {
        let methods = getCalculationMethodDropdown(category);
        let found = false;
        for (let method of methods) {
          let activities = getCombinedActivityReferenceDropdown(
            category,
            method
          );
          found = activities
            .map((activity) => {
              if (activityToMatch === activity.toLowerCase())
                console.log(activity.toLowerCase());
              return activity.toLowerCase();
            })
            .includes(activityToMatch);
          if (found) break;
        }
        return found;
      })
      .map((category) => category);
  }

  return (
    <Form className="w-100">
      <InputGroup className="">
        <InputGroupText>
          <RiSearch2Line />
        </InputGroupText>
        <Input
          variant={"filled"}
          type={"text"}
          placeholder="Search for emission activities..."
          onChange={(e) => setDebounced(e.currentTarget.value.toString())}
          {...inputProps}
        />
        <InputGroupText>
          {loadingResults && <Spinner size={"sm"} />}
          {results.length > 0 && !loadingResults && (
            <Button
              color="danger"
              className="border-0 m-0 rounded-pill"
              size="sm"
              onClick={() => {
                setResults([]);
              }}
            >
              Clear <MdOutlineClose />
            </Button>
          )}
        </InputGroupText>
      </InputGroup>
      <Alert color="warning" className="border-0">
        <HiOutlineLightBulb /> Enter your activity here to find the right
        emissions category. When you see the categories, click on them to go to
        the data entry area.
      </Alert>
      {results.length > 0 ? (
        <div className="factor-search-results overflow-scroll position-relative mt-2">
          {results.map((result) => {
            let activityToMatch =
              result.combinedActivityReference || result.sicCategory;
            const scope1MatchedCategories = getMatchingCategories(
              Object.values(CC_CONSTANTS.CC_EMISSION_SCOPE_1_CATEGORY_NAMES),
              activityToMatch
            );
            const scope2MatchedCategories = getMatchingCategories(
              Object.values(CC_CONSTANTS.CC_EMISSION_SCOPE_2_CATEGORY_NAMES),
              activityToMatch
            );
            const scope3MatchedCategories = getMatchingCategories(
              Object.values(CC_CONSTANTS.CC_EMISSION_SCOPE_3_CATEGORY_NAMES),
              activityToMatch
            );
            return (
              <Card className="bg-secondary-extra-light shadow-none border-0 rounded-3">
                <CardBody className="">
                  <h5>Activity information</h5>
                  <p>
                    {result.combinedActivityReference || result.sicCategory}{" "}
                  </p>
                  <Badge fade="primary"> Year: {result.year}</Badge>{" "}
                  <Badge fade="info">
                    Emission Factor: {result.ghgConversionFactor} kg CO2-eq/
                    {result.uom}
                  </Badge>
                  <h5 className="my-2">
                    Matching Scopes & Categories for your calculation
                  </h5>
                  <p className="text-dark mb-1">
                    {scope1MatchedCategories.length > 0 && (
                      <React.Fragment>
                        Scope 1:{" "}
                        {scope1MatchedCategories.map((cat) => (
                          <CategoryNavigateButton
                            category={cat}
                            onClick={onNavigate}
                          />
                        ))}
                      </React.Fragment>
                    )}
                  </p>
                  <p className="text-dark  mb-1">
                    {scope2MatchedCategories.length > 0 && (
                      <React.Fragment>
                        Scope 2:{" "}
                        {scope2MatchedCategories.map((cat) => (
                          <CategoryNavigateButton
                            category={cat}
                            onClick={onNavigate}
                          />
                        ))}
                      </React.Fragment>
                    )}
                  </p>
                  <p className="text-dark  mb-1">
                    {scope3MatchedCategories.length > 0 && (
                      <React.Fragment>
                        Scope 3:{" "}
                        {scope3MatchedCategories.map((cat) => (
                          <CategoryNavigateButton
                            category={cat}
                            onClick={onNavigate}
                          />
                        ))}
                      </React.Fragment>
                    )}
                  </p>
                  {/* <pre>{JSON.stringify(result, null, 2)}</pre> */}
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="factor-search-results d-flex flex-column align-items-center">
          <h4 className="my-2">No results found.</h4>
          <p>
            {" "}
            Try searching with most relavant keywords inline with defra
            database.
          </p>
        </div>
      )}
    </Form>
  );
}
