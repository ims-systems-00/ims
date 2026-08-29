import { Col, Row } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import overviewImage from "../../../assets/image/guidelines/image-1.png";
import enteringDataImage from "../../../assets/image/guidelines/image-10.png";
import addDataFormImage from "../../../assets/image/guidelines/image-11.png";
import reportingYearImage from "../../../assets/image/guidelines/image-12.png";
import threeDotsImage from "../../../assets/image/guidelines/image-13.png";
import customFactorsImage from "../../../assets/image/guidelines/image-14.png";
import dashboardImage from "../../../assets/image/guidelines/image-15.png";
import dashboardReportingYearImage from "../../../assets/image/guidelines/image-16.png";
import reportsImage from "../../../assets/image/guidelines/image-17.png";
import reductionPlanImage from "../../../assets/image/guidelines/image-18.png";
import dataGradingGuideImage from "../../../assets/image/guidelines/image-19.png";
import ourOrganisationImage from "../../../assets/image/guidelines/image-2.png";
import guidelinesImage from "../../../assets/image/guidelines/image-3.png";
import overviewTabImage from "../../../assets/image/guidelines/image-4.png";
import reportingPeriodsTabImage from "../../../assets/image/guidelines/image-5.png";
import locationsTabImage from "../../../assets/image/guidelines/image-6.png";
import addDataImage from "../../../assets/image/guidelines/image-7.png";
import dataCategoriesImage from "../../../assets/image/guidelines/image-8.png";
import selectingEmissionsCategoriesImage from "../../../assets/image/guidelines/image-9.png";
import { Box } from "../../../components/Box";
import Article from "./components/Article";
import Figure from "./components/Figure";
import Heading from "./components/Heading";
import Section from "./components/Section";

function Guidelines() {
  return (
    <div className="guidelines-container">
      <Row>
        <Col md="10" className="mx-auto max-width-1200">
          <Box className="overflow-hidden">
            <Section id="section-1">
              <Heading level={2}>Getting Started</Heading>
              <Article>
                Now that you have received your login credentials, you are ready
                to use this powerful tool to help your organisation report its
                greenhouse gas emissions.
              </Article>
              <Article>
                This guide will take you through each tab, step-by-step.
              </Article>
            </Section>
            <Section id="section-2">
              <Heading level={2}>Overview</Heading>
              <Article>
                You will see this menu on the left-hand side when you log in to
                the tool. The rest of the user guide explains each tab here.
                Follow the steps to use the tool.
              </Article>
              <Article>
                Firstly, you will fill out your company details, which will
                appear in your report in the Our Organisation section. Then, we
                will go to the Report Settings tab to enter the parameters of
                your carbon report.
              </Article>
              <Article>
                Then, you will be ready to go into the Add Data section and
                enter your data. Once data is entered, you will visualise it in
                your Dashboard for an overview. For a deeper dive, view the
                print of the various reports in the Reports section. The next
                step is to set out the decarbonisation strategy for your
                business or organisation in the Reduction Plan section.
              </Article>
              <Figure
                src={overviewImage}
                alt="Navigation Bar"
                caption="Figure 1: Navigation Bar"
              />
            </Section>

            <Section id="section-3">
              <Heading level={2}>Our Organisation</Heading>
              <Article>
                The Our Organisation tab is where you enter your company
                information; it provides the tool with key contact and location
                information about the company that will feature in the report.
              </Article>
              <Figure
                src={ourOrganisationImage}
                alt="Our Organisation"
                caption="Figure 2: Our Organisation"
              />
            </Section>

            <Section id="section-4">
              <Heading level={2}>Report Settings</Heading>
              <Article>
                In Report Settings, you will set your reporting boundaries. You
                will see a bar along the top with four tabs:
              </Article>

              {/* Subsection 4.1: Guidelines Tab */}
              <Section id="section-4-1" >
                <Heading level={3}>1 Guidelines Tab</Heading>
                <Article>
                  The Guidelines tab contains the document you are reading now;
                  you can download it for personal or training use.
                </Article>
                <Figure
                  src={guidelinesImage}
                  alt="Guidelines"
                  caption="Figure 3: Guidelines"
                />
              </Section>

              {/* Subsection 4.2: Overview Tab */}
              <Section id="section-4-2" >
                <Heading level={3}>2 Overview Tab</Heading>
                <Article>
                  The Overview tab has all the information about the report
                  boundaries. Fill in each box accordingly; each box is
                  explained below.
                </Article>
                <Figure
                  src={overviewTabImage}
                  alt="Overview"
                  caption="Figure 4: Overview"
                />

                <Heading level={4}>Reporting Start Date</Heading>
                <Article>
                  Choose a reporting start date that aligns with your data. For
                  many companies, this is the financial year. For example, you
                  would choose 01/04/2022, which means you are reporting on data
                  from the period 01/04/2022 – 31/03/2023 for the 2022 reporting
                  year. This will then generate your Reporting Periods in the
                  Reporting Periods tab, which we will look at later.
                </Article>

                <Heading level={4}>Base Year</Heading>
                <Article>
                  The Base Year is a stable reference point for the Reporting
                  Company. Emissions targets will be compared to the Base Year,
                  so this year should remain a stable benchmark. However, base
                  years may be changed or recalculated as the business develops
                  new targets.
                </Article>

                <Heading level={4}>Reporting Method</Heading>
                <Article>
                  Choose the appropriate reporting method, either location or
                  market-based reporting. Location-based reporting reflects the
                  average emissions intensity of grids on which energy
                  consumption occurs, attributing emissions based on
                  geographical location. Alternatively, market-based reporting
                  demonstrates a company's choice to procure energy and its
                  associated emissions benefits. It allows companies to claim
                  the benefits of their specific green power purchases and
                  contracts, such as renewable energy certificates, separate
                  from their physical location's grid emissions.
                </Article>

                <Heading level={4}>Organisational Boundaries</Heading>
                <Article>
                  These are the limits an organisation sets for accounting and
                  reporting its greenhouse gas emissions. Operational control,
                  financial control, and equity share are the three approaches
                  companies use to determine how much greenhouse gas (GHG)
                  emissions from their operations or investments should be
                  included in their carbon inventory.
                </Article>

                <Heading level={4}>Net zero</Heading>
                <Article>
                  This is the year the company aims to reach net zero, i.e., the
                  emissions produced by the business or organisation are zero or
                  significantly reduced. A net-zero ambition must be aligned
                  with the broader business strategy and stakeholder priorities.
                </Article>

                <Heading level={4}>Carbon Reduction Targets</Heading>
                <Article>
                  The percentage by which a company or organisation aims to
                  reduce carbon emissions.
                </Article>
              </Section>

              {/* Subsection 4.3: Reporting Periods Tab */}
              <Section id="section-4-3" >
                <Heading level={3}>3 Reporting Periods Tab</Heading>
                <Article>
                  The reporting period is a specific timeframe for collecting
                  data to track greenhouse gas emissions. If your Reporting
                  Start Date is 01/04/2019, your Reporting Period will run from
                  01/04/2019 to 31/03/2020 for the Reporting Year 2020. Then,
                  the 2019 Emissions Factors will be used to calculate the
                  emissions and applied to your reported data.
                </Article>
                <Figure
                  src={reportingPeriodsTabImage}
                  alt="Reporting Periods"
                  caption="Figure 5: Reporting Periods"
                />
              </Section>

              {/* Subsection 4.4: Locations Tab */}
              <Section id="section-4-4" >
                <Heading level={3}>4 Locations Tab</Heading>
                <Article>
                  If the reporting company or organisation has multiple
                  locations, sites or buildings within its Organisational
                  Boundary, these should be listed here. This calculator will
                  allow you to select locations and compare your emissions
                  across various locations. Click Create a Location, then search
                  for your locations and add each one.
                </Article>
                <Article>
                  This tab will pop up, and fill it in for each site from which
                  you have gathered data. Give each site a location name and
                  description, select whether your company or organisation will
                  include it in the greenhouse gas assessment, and then provide
                  any additional comments that may be relevant to the location.
                </Article>
                <Figure
                  src={locationsTabImage}
                  alt="Locations"
                  caption="Figure 6: Locations"
                />
              </Section>
            </Section>

            <Section id="section-5">
              <Heading level={2}>Add Data</Heading>
              <Figure
                src={addDataImage}
                alt="Add Data"
                caption="Figure 7: Add Data"
              />
              <Article>
                Go to the Add Data tab. All the emissions categories listed
                below are divided into scopes 1, 2, and 3. You must decide which
                ones are relevant to your organisation and its activities.
              </Article>
              <Figure
                src={dataCategoriesImage}
                alt="Data Categories"
                caption="Figure 8: Data Categories"
              />

              <Article>
                Selecting the relevant emissions categories is a crucial step in
                the reporting process. It ensures that all relevant emissions
                are accounted for, providing a comprehensive picture of your
                organisation's greenhouse gas emissions.
              </Article>

              <Heading level={3}>Selecting Emissions Categories</Heading>
              <Figure
                src={selectingEmissionsCategoriesImage}
                alt="Selecting Emissions Categories"
                caption="Figure 9: Selecting Emissions Categories"
              />
              <Article>
                When you have decided on the categories relevant to your
                organisation, click on the three dots in the top right-hand
                corner of each emissions category, as shown here.
              </Article>
              <Article>
                For the emissions categories you have chosen, select Relevant,
                Not Calculated. To indicate relevant categories for which you
                haven't yet added the data, the emissions category will now show
                Not Calculated in red, as shown here.
              </Article>
              <Article>
                For categories which are not relevant to your business or
                organisation, select 'Not Relevant', and the box will become
                greyed out and unclickable, as shown on the left here.
              </Article>

              <Heading level={3}>Entering your data in each Category</Heading>
              <Figure
                src={enteringDataImage}
                alt="Entering your data in each Category"
                caption="Figure 10: Entering your data in each Category"
              />
              <Article>
                To enter your data, hover over the name of the emissions
                category and click. You will be taken to a new page. In the top
                right-hand corner, click Add Data.
              </Article>

              <Figure
                src={addDataFormImage}
                alt="Add Data Form"
                caption="Figure 11: Add Data Form"
              />
              <Article>
                A panel will appear like the one for the Company Vehicles here.
                Enter the information into each box, starting with a Reference
                related to your company records. Then, enter the Supplier Name,
                if relevant. Next, select one of your Locations from those you
                added earlier.
              </Article>

              <Figure
                src={reportingYearImage}
                alt="Reporting Year"
                caption="Figure 12: Reporting Year"
              />
              <Article>
                You must select the Reporting Year for this piece of data. Be
                aware that the year the data is from may differ from the
                reporting year. For example, an electricity bill from 31/05/2021
                will fall within the reporting year 2022. So, be sure to check
                the dates as shown in the drop-down here.
              </Article>

              <Article>
                Next, select the Calculation Method, depending on whether you
                input Liters of fuel, KMs travelled, etc. Then, choose the unit
                of measurement which should be evident from your data. Then,
                enter the amount without commas, only with decimal places.
              </Article>

              <Article>
                Now select the Activity Data Grade. This is to report the
                quality of the data you are entering, which is vital to the
                overall reliability of the report. High-quality activity data is
                crucial for good GHG reporting, so when entering your data,
                please follow this grading scale to help you assess its accuracy
                and reliability. For a guide, see the activity Data Grading
                Guide in these guidelines.
              </Article>

              <Article>
                When all the boxes are filled with the relevant information,
                click, and you will see a new line of data inside the emissions
                category.
              </Article>

              <Figure
                src={threeDotsImage}
                alt="Three Dots"
                caption="Figure 13: Three Dots"
              />
              <Article>
                When you return to the Add Data home page, click the three dots
                in the right-hand corner and select Relevant, Calculated, to
                remind you and your colleagues that you have entered data into
                this Category.
              </Article>

              <Figure
                src={customFactorsImage}
                alt="Custom Factors"
                caption="Figure 14: Custom Factors"
              />
            </Section>

            <Section id="section-6">
              <Heading level={2}>Dashboard</Heading>
              <Article>
                Here, you can view the data that you put into the emissions
                categories on a dashboard, which gives a complete overview of
                your carbon emissions. It helps you track, analyse, and manage
                your environmental impact by consolidating data into
                easy-to-understand visuals like charts, graphs, and metrics.
              </Article>
              <Figure
                src={dashboardImage}
                alt="Dashboard"
                caption="Figure 15: Dashboard"
              />
              <Figure
                src={dashboardReportingYearImage}
                alt="Dashboard Reporting Year"
                caption="Figure 16: Dashboard Reporting Year"
              />

              <Article>
                You will see Reporting Year and a drop-down menu in the top
                left. This relates to the information you entered earlier in the
                Reporting Settings tab. As you select each reporting year from
                the drop-down menu, the Dashboard will display the data from
                that year.
              </Article>

              <Heading level={3}>Carbon Overview</Heading>
              <Article>
                The Dashboard presents the total carbon emissions measured in
                tonnes of CO₂ equivalents (CO₂e), offering an overview of your
                organisation's carbon impact over a specified period. It
                features a bar graph and a pie chart that visually displays the
                data for any reporting year. Additionally, there are sections
                that highlight the Emission Categories contributing the most
                CO₂e and the specific activities that generate the highest
                emissions. Lastly, the Dashboard outlines the net zero target
                and your organisation's carbon reduction goals.
              </Article>
            </Section>

            <Section id="section-7">
              <Heading level={2}>Reports</Heading>
              <Article>
                Your data will be presented as reports here; they are all
                available to download and/or print.
              </Article>
              <Figure
                src={reportsImage}
                alt="Reports"
                caption="Figure 17: Reports"
              />
            </Section>

            <Section id="section-8">
              <Heading level={2}>Reduction Plan</Heading>
              <Article>
                Here you will find a section on how to make a carbon reduction
                plan
              </Article>
              <Figure
                src={reductionPlanImage}
                alt="Reduction Plan"
                caption="Figure 18: Reduction Plan"
              />
            </Section>

            <Section id="section-9">
              <Heading level={2}>Data Grading Guide</Heading>
              <Figure
                src={dataGradingGuideImage}
                alt="Data Grading Guide"
                caption="Figure 19: Data Grading Guide"
              />
            </Section>
            <Section id="section-10">
              <Heading level={2}>Glossary of Terms</Heading>

              <Heading level={4}>Activity:</Heading>
              <Article>
                Any process or action that results in the consumption of
                resources or the generation of emissions. Examples include
                driving a car, operating machinery, or heating a building.
                Activities are tracked in carbon footprinting to estimate their
                associated emissions.
              </Article>

              <Heading level={4}>Base Year:</Heading>
              <Article>
                A specific year selected as a reference point for measuring
                future greenhouse gas (GHG) emissions. Organisations choose a
                base year to create a benchmark for tracking reductions in
                emissions over time. This helps them set and monitor their
                progress toward emissions reduction targets consistently and
                comparably.
              </Article>

              <Heading level={4}>Biogenic emissions</Heading>
              <Article>
                Are natural gases and particles released from plants, animals,
                and soil. Key sources include volatile organic compounds (or
                VOCs) from plants, methane from ruminant animals, and gases from
                soil bacteria. These emissions affect atmospheric chemistry and
                are influenced by environmental factors like temperature and
                sunlight.
              </Article>

              <Heading level={4}>Carbon Accounting:</Heading>
              <Article>
                A systematic method for tracking, measuring, and reporting
                carbon emissions within organisations, industries, or regions.
                It is used to monitor progress toward emissions reduction goals
                and is often a requirement for regulatory compliance or
                sustainability reporting.
              </Article>

              <Heading level={4}>Carbon Calculating:</Heading>
              <Article>
                Measuring or estimating the carbon emissions associated with
                specific activities, products, or processes. It involves
                gathering data and applying conversion and emission factors to
                quantify the greenhouse gases emitted.
              </Article>

              <Heading level={4}>Carbon Footprint:</Heading>
              <Article>
                The total amount of greenhouse gases (primarily carbon dioxide)
                emitted directly or indirectly by an individual, organisation,
                product, or activity, usually expressed in carbon dioxide
                equivalents (CO₂e). It represents the impact of climate change.
              </Article>

              <Heading level={4}>Climate Change:</Heading>
              <Article>
                Long-term alterations in global or regional climate patterns,
                particularly an increase in average global temperatures,
                primarily due to human activities like deforestation and burning
                fossil fuels. Climate change leads to various environmental,
                social, and economic impacts.
              </Article>

              <Heading level={4}>Climate Impact Assessment:</Heading>
              <Article>
                Encompasses carbon footprinting as part of assessing broader
                environmental impacts, including carbon emissions.
              </Article>

              <Heading level={4}>Conversion Factor:</Heading>
              <Article>
                A multiplier used to convert different units of activity data
                (e.g., litres of fuel consumed, kilowatt-hours of electricity
                used) into greenhouse gas emissions. It links physical
                quantities of resources used to their corresponding carbon
                emissions.
              </Article>

              <Heading level={4}>Environmental Footprint:</Heading>
              <Article>
                While broader than carbon footprinting, this term sometimes
                includes carbon as a key component and other ecological impacts,
                like water and resource use.
              </Article>

              <Heading level={4}>Emission:</Heading>
              <Article>
                The release of greenhouse gases or other pollutants into the
                atmosphere. Emissions can come from various human activities,
                such as burning fossil fuels, industrial processes, or
                agricultural practices.
              </Article>

              <Heading level={4}>Emission Factors:</Heading>
              <Article>
                Numerical values used to estimate the emissions produced by an
                activity, typically measured as emissions per unit of activity
                (e.g., kg of CO₂ emitted per litre of fuel burned). They help
                quantify the amount of greenhouse gases released into the
                atmosphere from specific sources.
              </Article>

              <Heading level={4}>Emissions Inventory:</Heading>
              <Article>
                A detailed list or database that quantifies the total amount of
                greenhouse gases emitted by an organisation, sector, or region
                over a specific period. Emissions inventories are typically used
                to assess emissions sources and develop strategies for reducing
                them.
              </Article>

              <Heading level={4}>Greenhouse Gas:</Heading>
              <Article>
                Gases in the Earth's atmosphere that trap heat and contribute to
                global warming. The primary greenhouse gases include carbon
                dioxide (CO₂), methane (CH₄), nitrous oxide (N₂O), and
                fluorinated gases.
              </Article>

              <Heading level={4}>
                Greenhouse Gas (GHG) Accounting or GHG Footprinting:
              </Heading>
              <Article>
                Focuses on calculating and reporting greenhouse gases
                specifically rather than all types of environmental impacts.
              </Article>

              <Heading level={4}>Greenhouse Gas Protocol:</Heading>
              <Article>
                A widely used international accounting and reporting standard
                that guides for organisations to measure, manage, and report
                their greenhouse gas emissions. It serves as a comprehensive
                framework for emissions management, including corporate, value
                chain, and product.
              </Article>

              <Heading level={4}>Intensity Ratios:</Heading>
              <Article>
                Used in carbon calculation to assess greenhouse gas (GHG)
                emissions relative to an economic variable like revenue or
                production output. Unlike absolute emissions, which show total
                volume, intensity ratios offer context by considering the scale
                or growth of the organisation and are spend, activity or
                production-based.
              </Article>
            </Section>
          </Box>
        </Col>
      </Row>
    </div>
  );
}

export default Guidelines;
