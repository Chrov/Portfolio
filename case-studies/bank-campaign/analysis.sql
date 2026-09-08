-- Fixed held-out cohort. This is descriptive capture, not causal uplift.
SELECT selected_top20, COUNT(*) AS contacts, SUM(subscribed) AS subscriptions,
 AVG(1.0*subscribed) AS observed_rate FROM holdout_scores GROUP BY selected_top20;
