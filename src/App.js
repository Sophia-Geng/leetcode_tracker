import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [problems, setProblems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilters, setTypeFilters] = useState([]);
  const [newProblem, setNewProblem] = useState({ id: '', name: '', types: [], difficulty: 'Easy', notes: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importData, setImportData] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ types: [], difficulty: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const types = ['数组', '哈希表', '双指针', '滑动窗口', '链表', '二叉树', 'DFS/BFS', '动态规划', '回溯', '贪心', '堆/栈', '图', '字符串', '二分查找', '迭代', '递归', '其他'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  // 从 Supabase 加载数据
  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('problem_id', { ascending: true });

      if (error) throw error;

      const converted = data.map(p => ({
        id: p.problem_id,
        name: p.name,
        types: p.types || [],
        difficulty: p.difficulty,
        notes: p.notes || '',
        reviews: (p.reviews || []).map(r => ({ ...r, date: new Date(r.date) })),
        nextReview: p.next_review ? new Date(p.next_review) : null,
        createdAt: new Date(p.created_at),
        dbId: p.id // 保存数据库的真实 ID
      }));
      setProblems(converted);
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextReview = (reviews) => {
    if (reviews.length === 0) return null;
    const lastReview = reviews[reviews.length - 1];
    const intervals = [1, 3, 7, 14, 30];
    const successCount = reviews.filter(r => r.success).length;
    const interval = intervals[Math.min(successCount, intervals.length - 1)];
    const next = new Date(lastReview.date);
    next.setDate(next.getDate() + interval);
    return next;
  };

  const getStatus = (problem) => {
    const successCount = problem.reviews.filter(r => r.success).length;
    if (successCount >= 4) return '已掌握';
    if (problem.reviews.length === 0) return '待开始';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextReview = problem.nextReview ? new Date(problem.nextReview) : null;
    if (nextReview) {
      nextReview.setHours(0, 0, 0, 0);
      if (nextReview <= today) return '需复习';
    }
    return '复习中';
  };

  const toggleNewProblemType = (type) => {
    setNewProblem(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const toggleEditType = (type) => {
    setEditForm(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const addProblem = async () => {
    if (!newProblem.id || !newProblem.name) {
      alert('请填写题号和题目名称');
      return;
    }
    if (newProblem.types.length === 0) {
      alert('请至少选择一个类型');
      return;
    }
    if (problems.find(p => p.id === parseInt(newProblem.id))) {
      alert('题目已存在！');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('problems')
        .insert([{
          problem_id: parseInt(newProblem.id),
          name: newProblem.name,
          types: newProblem.types,
          difficulty: newProblem.difficulty,
          notes: newProblem.notes,
          reviews: [],
          next_review: null
        }])
        .select()
        .single();

      if (error) throw error;

      const problem = {
        id: data.problem_id,
        name: data.name,
        types: data.types,
        difficulty: data.difficulty,
        notes: data.notes,
        reviews: [],
        nextReview: null,
        createdAt: new Date(data.created_at),
        dbId: data.id
      };

      setProblems([...problems, problem].sort((a, b) => a.id - b.id));
      setNewProblem({ id: '', name: '', types: [], difficulty: 'Easy', notes: '' });
      setShowAdd(false);
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const recordReview = async (problemId, success) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    let newReviews;
    let nextReview;

    if (!success) {
      newReviews = [{ date: new Date().toISOString(), success: false }];
      nextReview = new Date(Date.now() + 86400000);
    } else {
      newReviews = [...problem.reviews.map(r => ({ ...r, date: r.date.toISOString ? r.date.toISOString() : r.date })), { date: new Date().toISOString(), success }];
      nextReview = calculateNextReview(newReviews.map(r => ({ ...r, date: new Date(r.date) })));
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('problems')
        .update({
          reviews: newReviews,
          next_review: nextReview ? nextReview.toISOString() : null
        })
        .eq('problem_id', problemId);

      if (error) throw error;

      setProblems(problems.map(p => {
        if (p.id === problemId) {
          return {
            ...p,
            reviews: newReviews.map(r => ({ ...r, date: new Date(r.date) })),
            nextReview
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProblem = async (problemId) => {
    if (!window.confirm('确定删除这道题吗？')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('problem_id', problemId);

      if (error) throw error;

      setProblems(problems.filter(p => p.id !== problemId));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (problem) => {
    setEditingId(problem.id);
    setEditForm({
      types: problem.types || [],
      difficulty: problem.difficulty,
      notes: problem.notes || ''
    });
  };

  const saveEdit = async (problemId) => {
    if (editForm.types.length === 0) {
      alert('请至少选择一个类型');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('problems')
        .update({
          types: editForm.types,
          difficulty: editForm.difficulty,
          notes: editForm.notes
        })
        .eq('problem_id', problemId);

      if (error) throw error;

      setProblems(problems.map(p => {
        if (p.id === problemId) {
          return {
            ...p,
            types: editForm.types,
            difficulty: editForm.difficulty,
            notes: editForm.notes
          };
        }
        return p;
      }));
      setEditingId(null);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(problems, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetcode-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importData);
      
      if (!window.confirm(`确定导入 ${parsed.length} 道题吗？这会添加到现有数据中。`)) return;

      setSaving(true);
      
      for (const p of parsed) {
        const problemId = p.id || p.problem_id;
        if (problems.find(existing => existing.id === problemId)) {
          continue; // 跳过已存在的
        }

        await supabase
          .from('problems')
          .insert([{
            problem_id: problemId,
            name: p.name,
            types: p.types || (p.type ? [p.type] : []),
            difficulty: p.difficulty || 'Easy',
            notes: p.notes || '',
            reviews: p.reviews || [],
            next_review: p.nextReview || p.next_review || null
          }]);
      }

      await fetchProblems(); // 重新加载
      setImportData('');
      setShowExport(false);
      alert('导入成功！');
    } catch (e) {
      console.error('导入失败:', e);
      alert('导入失败，请检查数据格式');
    } finally {
      setSaving(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('确定清空所有数据吗？此操作不可恢复！')) return;
    if (!window.confirm('再次确认：真的要删除所有题目吗？')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('problems')
        .delete()
        .neq('id', 0); // 删除所有

      if (error) throw error;

      setProblems([]);
    } catch (error) {
      console.error('清空失败:', error);
      alert('清空失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 统计
  const stats = {
    total: problems.length,
    mastered: problems.filter(p => getStatus(p) === '已掌握').length,
    needReview: problems.filter(p => getStatus(p) === '需复习').length,
    inProgress: problems.filter(p => getStatus(p) === '复习中').length,
    notStarted: problems.filter(p => getStatus(p) === '待开始').length,
  };

  const typeStats = types.reduce((acc, type) => {
    acc[type] = problems.filter(p => p.types && p.types.includes(type)).length;
    return acc;
  }, {});

  const filteredProblems = problems.filter(p => {
    const status = getStatus(p);
    if (filter !== 'all' && status !== filter) return false;
    if (typeFilters.length > 0) {
      const problemTypes = p.types || [];
      const hasMatchingType = typeFilters.some(t => problemTypes.includes(t));
      if (!hasMatchingType) return false;
    }
    return true;
  });

  const toggleTypeFilter = (type) => {
    setTypeFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const todayProblems = problems.filter(p => getStatus(p) === '需复习');

  const getStatusStyle = (status) => {
    switch(status) {
      case '已掌握': return { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' };
      case '需复习': return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case '复习中': return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
      default: return { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' };
    }
  };

  const getDifficultyColor = (diff) => {
    switch(diff) {
      case 'Easy': return '#22c55e';
      case 'Medium': return '#eab308';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', background: '#f9fafb', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
          <div style={{ color: '#6b7280' }}>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '5px' }}>📚 LeetCode 复习追踪器</h1>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
        基于遗忘曲线 · 间隔复习 · <span style={{ color: '#22c55e' }}>☁️ 云端同步</span>
      </p>

      {/* 保存状态提示 */}
      {saving && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 1000 }}>
          保存中...
        </div>
      )}

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { key: 'all', label: '全部', count: stats.total, color: '#3b82f6' },
          { key: '已掌握', label: '已掌握', count: stats.mastered, color: '#22c55e' },
          { key: '需复习', label: '需复习', count: stats.needReview, color: '#ef4444' },
          { key: '复习中', label: '进行中', count: stats.inProgress, color: '#eab308' },
          { key: '待开始', label: '待开始', count: stats.notStarted, color: '#6b7280' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            style={{
              padding: '15px 10px',
              background: 'white',
              border: filter === item.key ? `3px solid ${item.color}` : '1px solid #e5e7eb',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: item.color }}>{item.count}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.label}</div>
          </button>
        ))}
      </div>

      {/* 今日任务 */}
      {todayProblems.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
          <h3 style={{ color: '#991b1b', marginTop: 0, marginBottom: '10px' }}>🔥 今日待复习 ({todayProblems.length}题)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {todayProblems.map(p => (
              <span key={p.id} style={{ background: '#fee2e2', padding: '4px 10px', borderRadius: '5px', fontSize: '13px' }}>
                #{p.id} {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 类型筛选 */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>类型筛选 {typeFilters.length > 0 && `(已选${typeFilters.length}个)`}</span>
          {typeFilters.length > 0 && (
            <button 
              onClick={() => setTypeFilters([])}
              style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              清除选择
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {types.map(t => {
            const isSelected = typeFilters.includes(t);
            const count = typeStats[t] || 0;
            return (
              <button
                key={t}
                onClick={() => toggleTypeFilter(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  background: isSelected ? '#dbeafe' : 'white',
                  color: isSelected ? '#1d4ed8' : '#374151',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isSelected ? '500' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          {showAdd ? '取消' : '+ 添加新题目'}
        </button>
        <button
          onClick={() => setShowExport(!showExport)}
          style={{ padding: '12px 20px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          📦 备份/导入
        </button>
        <button
          onClick={fetchProblems}
          style={{ padding: '12px 15px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          title="刷新数据"
        >
          🔄
        </button>
      </div>

      {/* 备份导入 */}
      {showExport && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ marginTop: 0 }}>数据备份与恢复</h4>
          <button onClick={exportData} style={{ width: '100%', padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '10px', cursor: 'pointer' }}>
            📥 导出JSON文件
          </button>
          <textarea
            placeholder="粘贴之前导出的JSON数据..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px', minHeight: '80px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <button onClick={handleImport} disabled={saving} style={{ width: '100%', padding: '10px', background: '#f97316', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '10px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            📤 导入数据
          </button>
          <button onClick={clearAllData} disabled={saving} style={{ width: '100%', padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            🗑️ 清空所有数据
          </button>
        </div>
      )}

      {/* 添加表单 */}
      {showAdd && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
            <input
              type="number"
              placeholder="题号"
              value={newProblem.id}
              onChange={(e) => setNewProblem({...newProblem, id: e.target.value})}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            />
            <input
              type="text"
              placeholder="题目名称 (如: Two Sum)"
              value={newProblem.name}
              onChange={(e) => setNewProblem({...newProblem, name: e.target.value})}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            />
          </div>
          
          {/* 类型多选 */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
              选择类型（可多选）{newProblem.types.length > 0 && <span style={{ color: '#3b82f6' }}>已选 {newProblem.types.length} 个</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {types.map(t => {
                const isSelected = newProblem.types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleNewProblemType(t)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '15px',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      background: isSelected ? '#dbeafe' : 'white',
                      color: isSelected ? '#1d4ed8' : '#374151',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: isSelected ? '500' : 'normal'
                    }}
                  >
                    {isSelected && '✓ '}{t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 难度选择 */}
          <div style={{ marginBottom: '10px' }}>
            <select
              value={newProblem.difficulty}
              onChange={(e) => setNewProblem({...newProblem, difficulty: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            >
              {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <textarea
            placeholder="思路笔记 (可选)"
            value={newProblem.notes}
            onChange={(e) => setNewProblem({...newProblem, notes: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical' }}
          />
          <button
            onClick={addProblem}
            disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', opacity: saving ? 0.5 : 1 }}
          >
            {saving ? '保存中...' : '添加题目'}
          </button>
        </div>
      )}

      {/* 筛选提示 */}
      {(filter !== 'all' || typeFilters.length > 0) && (
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
          当前筛选: {filter !== 'all' ? filter : ''} {typeFilters.length > 0 ? typeFilters.join(', ') : ''} - 共 {filteredProblems.length} 题
          <button 
            onClick={() => { setFilter('all'); setTypeFilters([]); }} 
            style={{ marginLeft: '10px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            清除筛选
          </button>
        </div>
      )}

      {/* 题目列表 */}
      <div>
        {filteredProblems.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
            {problems.length === 0 ? '还没有添加题目，点击上方"添加新题目"开始' : '没有符合条件的题目'}
          </div>
        ) : (
          filteredProblems.map(problem => {
            const status = getStatus(problem);
            const successCount = problem.reviews.filter(r => r.success).length;
            const statusStyle = getStatusStyle(status);
            const isEditing = editingId === problem.id;
            
            return (
              <div 
                key={problem.id} 
                style={{ 
                  background: 'white', 
                  padding: '15px', 
                  borderRadius: '10px', 
                  marginBottom: '10px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${getDifficultyColor(problem.difficulty)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>#{problem.id}</span>
                    <span style={{ marginLeft: '8px' }}>{problem.name}</span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: getDifficultyColor(problem.difficulty) }}>
                      {problem.difficulty}
                    </span>
                  </div>
                  <span style={{ ...statusStyle, padding: '3px 10px', borderRadius: '5px', fontSize: '12px' }}>
                    {status}
                  </span>
                </div>

                {/* 编辑模式 */}
                {isEditing ? (
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '6px' }}>类型（可多选）</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {types.map(t => {
                          const isSelected = editForm.types.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleEditType(t)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                background: isSelected ? '#dbeafe' : 'white',
                                color: isSelected ? '#1d4ed8' : '#374151',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              {isSelected && '✓ '}{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '6px' }}>难度</div>
                      <select
                        value={editForm.difficulty}
                        onChange={(e) => setEditForm({...editForm, difficulty: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '13px' }}
                      >
                        {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '6px' }}>笔记</div>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '13px', minHeight: '60px', boxSizing: 'border-box', resize: 'vertical' }}
                        placeholder="添加思路笔记..."
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => saveEdit(problem.id)}
                        disabled={saving}
                        style={{ flex: 1, padding: '8px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px', opacity: saving ? 0.5 : 1 }}
                      >
                        {saving ? '保存中...' : '✓ 保存'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ flex: 1, padding: '8px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {(problem.types || []).map(t => (
                        <span key={t} style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                          {t}
                        </span>
                      ))}
                      <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6b7280' }}>进度: {successCount}/4 ✅</span>
                    </div>

                    {problem.notes && (
                      <div style={{ fontSize: '12px', color: '#4b5563', background: '#f9fafb', padding: '8px', borderRadius: '5px', marginBottom: '8px' }}>
                        💡 {problem.notes}
                      </div>
                    )}
                  </>
                )}

                <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '10px', height: '6px', marginBottom: '10px' }}>
                  <div style={{ width: `${(successCount/4)*100}%`, background: '#22c55e', height: '6px', borderRadius: '10px', transition: 'width 0.3s' }}></div>
                </div>

                {!isEditing && (
                  status !== '已掌握' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => recordReview(problem.id, true)}
                        disabled={saving}
                        style={{ flex: 1, padding: '10px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
                      >
                        ✅ 做对了
                      </button>
                      <button
                        onClick={() => recordReview(problem.id, false)}
                        disabled={saving}
                        style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
                      >
                        ❌ 做错了
                      </button>
                      <button
                        onClick={() => startEdit(problem)}
                        style={{ padding: '10px 12px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteProblem(problem.id)}
                        disabled={saving}
                        style={{ padding: '10px 12px', background: '#f3f4f6', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
                      >
                        🗑️
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#22c55e', fontSize: '14px' }}>🎉 已掌握！</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startEdit(problem)}
                          style={{ padding: '8px 12px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => deleteProblem(problem.id)}
                          disabled={saving}
                          style={{ padding: '8px 12px', background: '#f3f4f6', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', opacity: saving ? 0.5 : 1 }}
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </div>
                  )
                )}

                {problem.nextReview && status !== '已掌握' && !isEditing && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                    下次复习: {new Date(problem.nextReview).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 使用说明 */}
      <div style={{ marginTop: '30px', background: '#eff6ff', padding: '15px', borderRadius: '10px', fontSize: '13px' }}>
        <h4 style={{ color: '#1e40af', marginTop: 0 }}>📖 使用说明</h4>
        <ul style={{ color: '#1e40af', paddingLeft: '20px', margin: 0 }}>
          <li>点击顶部数字可筛选不同状态的题目</li>
          <li>复习间隔: 1天 → 3天 → 7天 → 14天 → 掌握</li>
          <li>点"做错了"会重置进度，需要重新开始</li>
          <li>点击 ✏️ 可以编辑类型和笔记</li>
          <li>☁️ 数据已云端同步，换设备也能访问</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
