import React from 'react';

import SuccessDisplay from './SuccessDisplay';

import { ResultOkProps } from '../../types';

// La definición de ResultOkProps se movió a ../../types


type ResultComponentMap = {
    [key: string]: React.FC<ResultOkProps>; 
};

export let resultsOk: ResultComponentMap = {
    'successful_operation': SuccessDisplay as React.FC<ResultOkProps>,
};

export const extendResultsOk = (newComponents: ResultComponentMap) => {
    resultsOk = { ...resultsOk, ...newComponents };
};