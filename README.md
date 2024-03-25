# Human-IQ

This repository is dedicated to a generalized approach of Human-IQ, where users can define their own Langchain pipeline with the flexibility to choose from multiple methods of few-shot examples, including Determinantal Point Processes (DPP) and sentence similarity. The goal of this project is to provide a customizable and extensible framework for building Langchain-based applications.

## File Structure

The project consists of the following files:

1. `base_agent.py`: This file contains the abstract base class `BaseAgent` that defines the interface for the agent. It includes abstract methods for planning and tool run logging.

2. `custom_agent.py`: This file contains the `CustomAgent` class, which is a concrete implementation of `BaseAgent`. It defines the behavior of the agent, including input handling, planning, and execution.

3. `output_parsers.py`: This file contains the abstract base class `BaseOutputParser` and its concrete implementation `CustomOutputParser`. These classes are responsible for parsing the output of the language model and extracting relevant information.

4. `prompt_templates.py`: This file contains the `CustomPromptTemplate` class, which is used to generate prompts for the language model based on the provided template and tools.

5. `template_construction.py`: This file contains the abstract base class `BaseTemplateConstruction` and its concrete implementation `TemplateConstruction`. These classes are responsible for constructing the prompt templates used by the agent.

6. `langchain_impl.py`: This file contains the abstract base class `BaseLangchainImpl` and its concrete implementation `LangchainImpl`. These classes provide the high-level interface for using the Langchain library and executing the agent.

7. `tool_provider.py`: This file contains the abstract base class `BaseToolProvider` and its concrete implementation `CustomToolProvider`. These classes allow users to define their own tools and provide them to the agent.

## Usage

To use the Human-IQ framework, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/NIMI-research/Human-IQ.git
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Define your custom tools by creating instances of `Tool` and providing them to the `CustomToolProvider`:
   ```python
   from langchain.tools import Tool
   from tool_provider import CustomToolProvider

   def  wikipedia_search(query):
       # Custom wikipedia search implementation
       pass

   def get_wikidata_id(string):
       # Custom implementation
       pass

   custom_tools = [
       Tool(
           name="wikipedia_search",
           func=custom_search,
           description="Useful for performing custom searches over wikipedia.",
       ),
       Tool(
           name="get_wikidata_id",
           func=custom_calculator,
           description="Useful to retrieve wikidata entity ID given their label.",
       ),
   ]

   tool_provider = CustomToolProvider(custom_tools)
   ```

4. Create an instance of `LangchainImpl` with the desired parameters and execute the pipeline:
   ```python
   from langchain_impl import LangchainImpl

   dataset = "mintaka"
   model_name = "gpt-4"
   dynamic = True
   DPP = False

   langchain_impl = LangchainImpl(dataset, model_name, tool_provider, dynamic, DPP)
   question = "Who was Kentucky's first governor?"
   out, answer_template_for_inference, completion_tokens = langchain_impl.execute_agent(question)
   ```

The Human-IQ framework provides several options for customization:

- **Custom Tools**: Define your own tools by creating instances of `Tool` and providing them to the `CustomToolProvider`. This allows you to extend the functionality of the Langchain pipeline based on your specific use case.

- **Few-Shot Examples**: Choose from multiple methods of few-shot examples, including Determinantal Point Processes (DPP) and sentence similarity. Modify the `TemplateConstruction` class in `template_construction.py` to implement your desired method.

- **Custom Agents**: Implement your own custom agents by extending the `BaseAgent` class in `base_agent.py` and providing your implementation in a new file.

- **Custom Output Parsers**: Implement your own output parsers by extending the `BaseOutputParser` class in `output_parsers.py` and providing your implementation in a new file.