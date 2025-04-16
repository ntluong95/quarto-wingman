import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import country_converter as coco
import matplotlib.pyplot as plt
from great_tables import GT, html

foo = 10 * 10
bar = 20 + 30

# >>> foo + bar

# Load the data
sdi_raw = pd.read_csv("data/sdi.csv")
cmi_raw = pd.read_csv("data/child_mortality.csv")
fsi_raw = pd.read_csv("data/food_supply.csv")
pop_raw = pd.read_csv("data/population.csv")


# Query data according to timeframe
def subset_data(df: pd.DataFrame, index: str) -> pd.DataFrame:
    df = (
        df.melt(id_vars=["country"], var_name="year", value_name=index)
        .assign(year=lambda x: pd.to_numeric(x["year"], errors="coerce"))
        .sort_values(by=["country", "year"])
        .query("year >= 1990 & year <= 2020")
    )
    return df


ml

sdi = subset_data(sdi_raw, "sdi")
cmi = subset_data(cmi_raw, "cmi")
fsi = subset_data(fsi_raw, "fsi")
pop = subset_data(pop_raw, "pop")

final_data = pd.merge(sdi, cmi).merge(fsi).merge(pop)


# Add country classification according to region and income level T
final_data = final_data.assign(
    pop=lambda df: df["pop"].apply(
        lambda x: float(x[:-1]) * 1e9
        if x.upper().endswith("B")
        else float(x[:-1]) * 1e6
        if x.upper().endswith("M")
        else float(x[:-1]) * 1e3
        if x.upper().endswith("K")
        else float(x)
    ),
    iso3=lambda df: coco.convert(
        names=df["country"].replace({"UAE": "United Arab Emirates"}), to="ISO3"
    ),
    region=lambda df: coco.convert(
        names=df["country"].replace({"UAE": "United Arab Emirates"}), to="continent"
    ),
    food_supply_status=lambda df: np.select(
        condlist=[(df["fsi"] >= 1500) & (df["fsi"] <= 3000)],
        choicelist=["Meets basic needs"],
        default="Does not meet basic needs",
    ),
)

del cmi_raw, sdi_raw, fsi_raw, pop_raw


class PromptDesigner:
    def __init__(self):
        # Store different parts of the prompt as class attributes
        self.persona_task_description = """
        You are an epidemiologist tasked with identifying sentences or phrases from outbreak reports that describe the drivers or contributors to the emergence or transmission of emerging pests and pathogens.
        """

        self.domain_localization = """
        Here is the definition of DPSIR (Drivers, Pressure, State, Impacts, and Responses) framework, where it shows how drivers are associated with the emergence of disease.
        Drivers: underlying socio-economic, environmental, or ecological forces that create conditions favourable for how a disease emerges, spreads or sustains transmission in human, animals or plants.
        Pressure: human anthropogenic activities that are mainly responsible for the chances of spillover events and the transmission of pests and pathogens.
        State: the current circulation of pests and pathogens, represented as either new case detected, an endemic, an epidemic or a pandemic.
        Impacts: the effects caused by pests and pathogens on individuals, communities' socio-economic, and political.
        Responses: the actions and interventions taken by governments to manage the occurrence of drivers and pressures, and to control the spread of pests and pathogens and to mitigate the impacts.
        """

        self.causality_definition = """
        Causality definition: In the reports, causality can take two forms. The first form is "Intra-sentence causality", where the “cause” and the “effect” lie in a single sentence, while in "Inter-sentence causality", the “cause” and the “effect” lie in different sentences.
        """

        self.extraction_guide = """
        Input text: The sudden appearance of unlinked cases of mpox in South Africa without a history of international travel, the high HIV prevalence among confirmed cases, and the high case fatality ratio suggest that community transmission is underway, and the cases detected to date represent a small proportion of all mpox cases that might be occurring in the community; it is unknown how long the virus may have been circulating. This may in part be due to the lack of early clinical recognition of an infection with which South Africa previously gained little experience during the ongoing global outbreak, potential pauci-symptomatic manifestation of the disease, or delays in care-seeking behaviour due to limited access to care or fear of stigma.
        
        Expected output
        1. Raw text with marked causes and effects
        The sudden appearance of unlinked cases of mpox in South Africa without a history of international travel, the high HIV prevalence among confirmed cases, and the high case fatality ratio suggest that (E1) community transmission (E1) is underway, and the cases detected to date represent a small proportion of all mpox cases that might be occurring in the community; it is unknown how long the virus may have been circulating. This may in part be due to the (C1) lack of early clinical recognition of an infection (C1) with which South Africa previously gained little experience during the ongoing global outbreak, potential (C1) pauci-symptomatic manifestation of the disease (C1), or (C1, E2) delays in care-seeking behavior (C1, E2) due to (C2) limited access to care (C2) or (C2) fear of stigma (C2).
       
        2. Extracted causes and effects
        C1: lack of early clinical recognition of an infection -> E1: community transmission 
        C1: pauci-symptomatic manifestation of the disease -> E1: community transmission 
        C1: delays in care-seeking behavior -> E1: community transmission 
        C2: limited access to care -> E2: delays in care-seeking behaviour
        C2: fear of stigma -> E2: delays in care-seeking behaviour delays in care-seeking behaviour  
        """

        self.few_shot_examples = """
        Below are some examples how causality can be reported in different forms:
        - Single cause, single effect (Type 1)

        Example 1: (C1) High population density and mobility in urban areas (C1) have facilitated (E1) the rapid spread of the virus (E1)". 

        Example 2: There is (C1) no vaccine for Influenza A(H1N1)v infection currently licensed for use in humans (C1). Seasonal influenza vaccines against human influenza viruses are generally not expected to protect people from (E1) infection with influenza viruses (E1) that normally circulate in pigs, but they can reduce severity.


        - Single cause, multiple effects (Type 2)

        Example 3: Several countries including Cameroon, Ethiopia, Haiti, Lebanon, Nigeria (north-east of the country), Pakistan, Somalia, Syria and the Democratic Republic of Congo (eastern part of the country) are in the midst of complex (C1) humanitarian crises (C1) with (E1) fragile health systems (E1), (E1) inadequate access to clean water and sanitation (E1) and have (E1) insufficient capacity to respond to the outbreaks (E1)

        - Multiple causes, single effect (Type 3)
        Example 4: Moreover, (C1) a low index of suspicion (C1), (C1) socio-cultural norms (C1), (C1) community resistance (C1), (C1) limited community knowledge regarding anthrax transmission (C1), (C1) high levels of poverty (C1) and (C1) food insecurity (C1), (C1) a shortage of available vaccines and laboratory reagents (C1), (C1) inadequate carcass disposal (C1) and (C1) decontamination practices (C1) significantly contribute to hampering (E1) the containment of the anthrax outbreak (E1).

        Example 5:
        The (E1) risk at the national level (E1) is assessed as 'High' due to the following:
        + In other parts of Timor-Leste (C1) health workers have limited knowledge dog bite and scratch case management (C1) including PEP and RIG administration
        + (C2) Insufficient stock of human rabies vaccines (C2) in the government health facilities.

        - Multiple causes, multiple effects (Type 4) - Chain of causalities
        The text may describe a chain of causality, where one effect becomes then the cause of another effect. To describe the chain, you should number the causes and effects. For example, cause 1 (C1) -> effect 1 (E1), but since effect 1 is also cause of effect 2, you should do cause 1 (C1) -> effect 1 (E1, C2) -> effect 2 (E2). 

        Example 6: (E2) The risk of insufficient control capacities (E2) is considered high in Zambia due to (C1) concurrent public health emergencies in the country (cholera, measles, COVID-19) (C1) that limit the country’s human and (E1, C2) financial capacities to respond to the current anthrax outbreak adequately (E1, C2).

        Example 7: (C1) Surveillance systems specifically targeting endemic transmission of chikungunya or Zika are weak or non-existent (C1) -> (E1, C2) Misdiagnosis between diseases  & Skewed surveillance (E1, C2) -> (E2, C3) Misinform policy decisions (E2, C3) -> (E3)reduced accuracy on the estimation of the true burden of each diseases (E3), poor risk assessments (E3), and non optimal clinical management and resource allocation (E3). 

        Example 8: (C1) Changes in the predominant circulating serotype (C1) -> (E1, C2) increase the population risk of subsequent exposure to a heterologous DENV serotype (E1, C2), -> (E2) which increases the risk of higher rates of severe dengue and deaths (E2).

        """

        self.negative_cases = """
        Irrelevant causality (negative cases): Some sentences contain causal relationships, but the effect may not be related to the disease transmission or emergence. Avoid classifying those causal relationships.

        Example 1 (no causality): Because these viruses continue to be detected in swine populations worldwide, further human cases following direct or indirect contact with infected swine can be expected.

        Example 2 (no relevant causality): There is some (E1) pressure on the healthcare capacity (E1) due to the (C1) very high number of admissions for dengue (C1); (C1) high vector density (C1); and an (C1) anticipated prolonged monsoon (C1). 

        Example 3 (no relevant causality): (C1) MVD is a highly virulent disease (C1) that can cause (E1) haemorrhagic fever (E1) and is clinically similar to Ebola virus disease.

        """

        self.mechanism_of_causality = """
        When the text describes/list possible mechanisms behind the cause of transmission or emergence, tag them with (M). A mechanism of causality describes the specific interactions between the pathogen, host, and environment that causes the transmission / emergence. They often describe interactions at the physiological level. 

        Example 1: The global outbreak 2022 — 2024 has shown that (C1) sexual contact (C1) enables faster and more efficient (E1) spread of the virus (E1) from one person  to another due to (M1) direct contact of mucous membranes between people (M1), (M1) contact with multiple partners (M1), (M1) a possibly shorter incubation period on average (M1), and (M1) a longer infectious period for immunocompromised individuals (M1).

        """

        self.sign_of_causality = """
        For each cause-effect relationship, indicate whether each cause (C) is positive (C+) or negative (C-) and each effect (E) is positive (E+) or negative (E-). 
        Use the list of positive and negative sign words provided to help determine the sign of each cause and effect. Be mindful of sentences with negations (e.g., “does not improve”), which reverses polarity. 
        Positive sign words: increase, facilitate, support, improve, expand, promote, enable, enhance, accelerate, advance, grow, boost, strengthen, benefit, contribute, progress, initiate, develop, elevate, stimulate, alleviate, optimize, revitalize. 
        Negative sign words: limit, decrease, reduce, hamper, hinder, restrict, suppress, impair, inhibit, undermine, challenge, disrupt, lack, insufficient, incomplete, challenge, deficit, obstacle, barrier, diminish, shortage, scarcity, obstruct, worsen, decline. 

        Example 1: “(C1-) a lack of timely access to diagnostics in many areas (C1-), (C1-) incomplete epidemiological investigations (C1-), (C1-) challenges in contact tracing and extensive but inconclusive animal investigations (C1-) continue to hamper rapid response (E1-)”

        Example 2: Moreover, (C1-) a low index of suspicion (C1-), (C1) socio-cultural norms (C1), (C1) community resistance (C1), (C1-) limited community knowledge regarding anthrax transmission (C1-), (C1+) high levels of poverty (C1+) and (C1) food insecurity (C1), (C1-) a shortage of available vaccines and laboratory reagents (C1-), (C1-) inadequate carcass disposal (C1-) and (C1) decontamination practices (C1) significantly contribute to hampering (E1-) the containment of the anthrax outbreak (E1-).
        """

    def generate_prompt(
        self,
        include_persona=False,
        include_domain=False,
        include_causality=False,
        include_guidance=False,
        include_examples=False,
        include_negative=False,
        include_mechanism=False,
        include_sign=False,
    ):
        """
        Dynamically generate a prompt based on the specified parts.
        """
        # Start with an empty prompt
        prompt = ""

        # Append parts based on the arguments provided
        if include_persona:
            prompt += self.persona_task_description + "\n"

        if include_domain:
            prompt += self.domain_localization + "\n"
        if include_causality:
            prompt += self.causality_definition + "\n"
        if include_guidance:
            prompt += self.extraction_guide + "\n"
        if include_examples:
            prompt += self.few_shot_examples + "\n"
        if include_negative:
            prompt += self.negative_cases + "\n"
        if include_mechanism:
            prompt += self.mechanism_of_causality + "\n"
        if include_sign:
            prompt += self.sign_of_causality + "\n"

        return prompt
