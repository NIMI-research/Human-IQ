import os
import json
import random
from abc import ABC, abstractmethod
from typing import List
from sentence_transformers import SentenceTransformer, util
import numpy as np
from enchant.utils import levenshtein

class BaseTemplateConstruction(ABC):
    def __init__(self, question: str, dataset: str):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.question = question
        self.dataset = dataset

    @abstractmethod
    def few_shot_with_dpp(self) -> str:
        pass

    @abstractmethod
    def full_shot_with_diversity(self) -> str:
        pass

    @abstractmethod
    def static_prompt_construction(self) -> str:
        pass

    def load_dataset_for_few_shot(self, path: str) -> List[str]:
        questions = []
        with open(path, "r") as file:
            data = json.load(file)
        for x in data:
            if x.get("Question") is not None:
                questions.append(x.get("Question"))
        return questions

    def cos_sim(self, element: str, model: SentenceTransformer, labels_sim: np.ndarray, threshold: int = 2) -> np.ndarray:
        x = model.encode([element])
        res = util.dot_score(x, labels_sim)
        res = res.squeeze()
        y = np.array(res)
        ind = np.argpartition(y, -threshold)[-threshold:]
        ind = ind[np.argsort(y[ind])]
        return ind

    def cos_sim_least(self, element: str, model: SentenceTransformer, labels_sim: np.ndarray, threshold: int = 2, most_similar: bool = False) -> np.ndarray:
        x = model.encode([element])
        res = util.dot_score(x, labels_sim)
        res = res.squeeze()
        y = np.array(res)
        if most_similar:
            ind = np.argpartition(y, -threshold)[-threshold:]
        else:
            ind = np.argpartition(y, threshold)[:threshold]
        ind = ind[np.argsort(y[ind])]
        return ind

    def most_similar_items(self, question: str, questions: List[str], threshold: int = 1) -> List[str]:
        labels_sim = self.model.encode(questions)
        indexes = self.cos_sim(question, self.model, labels_sim, threshold=threshold)
        if len(indexes) == 1:
            res_list = questions[indexes[0]]
        else:
            res_list = [questions[i] for i in indexes]
        return res_list

    def dpp_function(self, q: np.ndarray, final_list: np.ndarray) -> List[int]:
        K = q * final_list * q
        obj_log_det = LogDeterminantFunction(n=20,
                                             mode="dense",
                                             lambdaVal=0,
                                             sijs=K)
        greedy_indices_and_scores = obj_log_det.maximize(budget=3,
                                                         optimizer='NaiveGreedy',
                                                         stopIfZeroGain=False,
                                                         stopIfNegativeGain=False,
                                                         verbose=False)
        greedy_indices, greedy_scores = zip(*greedy_indices_and_scores)
        return list(greedy_indices)

class TemplateConstruction(BaseTemplateConstruction):
    def __init__(self, question: str, dataset: str, wikidata: bool = False, cos: bool = False, div: bool = False):
        super().__init__(question, dataset)
        self.wikidata = wikidata
        self.cos = cos
        self.div = div

    def few_shot_with_dpp(self) -> str:
        path = os.getcwd()
        questions = self.load_dataset_for_few_shot(f"{path}/data/{self.dataset}.json")
        q = self.most_similar_items(self.question, questions)
        with open(f"{path}/data/{self.dataset}.json", "r") as file:
            data = json.load(file)
            action_sequence_list = [x.get("Action_Sequence") for x in data]
            final_list = []
            for i in action_sequence_list:
                x = [1 - levenshtein(i, j) / max(len(i), len(j)) for j in action_sequence_list]
                final_list.append(x)
            final_list = np.array(final_list)
        indices = self.dpp_function(q, final_list)
        final_template = f"Example 1:{data[indices[0]].get('One_Shot')}\n\nExample 2:\n\n{data[indices[1]].get('One_Shot')}\n\nExample 3:\n\n{data[indices[2]].get('One_Shot')}"
        return final_template

    def full_shot_with_diversity(self) -> str:
        path = os.getcwd()
        questions = self.load_dataset_for_few_shot(f"{path}/data/{self.dataset}.json")
        fetching_ques = self.most_similar_items(self.question, questions)
        with open(f"{path}/data/{self.dataset}.json", "r") as file:
            data = json.load(file)
            action_sequence = ""
            action_sequence_list = []
            final_template = ""
            for idx, x in enumerate(data):
                if x.get("Question").strip() == fetching_ques.strip():
                    action_sequence = x.get("Action_Sequence").strip().strip("\t")
                    final_template = f"Example 1: \n\n{final_template}{x.get('One_Shot')}"
                action_sequence_list.append(x.get("Action_Sequence").strip().strip("\t"))
            similar_sequences = self.model.encode(action_sequence_list)
            if self.cos:
                indexes = self.cos_sim_least(action_sequence, self.model, similar_sequences, 3, most_similar=True)
                final_template = f"Example 1:{final_template}\n\nExample 2:\n\n{data[indexes[1]].get('One_Shot')}\n\nExample 3:\n\n{data[indexes[2]].get('One_Shot')}"
            elif self.div:
                indexes = self.cos_sim_least(action_sequence, self.model, similar_sequences, 10, most_similar=False)
                selected_indices = random.sample(list(indexes), 3)
                final_template = f"Example 1:{data[selected_indices[0]].get('One_Shot')}\n\nExample 2:\n\n{data[selected_indices[1]].get('One_Shot')}\n\nExample 3:\n\n{data[selected_indices[2]].get('One_Shot')}"
            else:
                indexes = self.cos_sim_least(action_sequence, self.model, similar_sequences, 2)
                final_template = f"{final_template}\n\nExample 2:\n\n{data[indexes[0]].get('One_Shot')}\n\nExample 3:\n\n{data[indexes[1]].get('One_Shot')}"
            return final_template

    def static_prompt_construction(self) -> str:
        path = os.getcwd()
        if self.wikidata:
            questions = self.load_dataset_for_few_shot(f"{path}/data_late_fusion/{self.dataset}.json")
            full_path = f"{path}/data_late_fusion/{self.dataset}.json"
        else:
            questions = self.load_dataset_for_few_shot(f"{path}/data/{self.dataset}.json")
            full_path = f"{path}/data/{self.dataset}.json"
        selected_questions = random.sample(questions, 3)
        with open(full_path, "r") as file:
            data = json.load(file)
            final_template = ""
            counter = 0
            for x in data:
                for question in selected_questions:
                    if x.get("Question").strip() == question.strip():
                        counter = counter + 1
                        final_template = f"{final_template}\n\nExample {counter}: \n\n{x.get('One_Shot')}"
            return final_template
